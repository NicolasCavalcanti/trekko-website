const createDocumentStub = () => {
  const elements = new Map();
  const documentStub = {
    addEventListener: jest.fn(),
    createElement: jest.fn(() => ({
      innerHTML: '',
      className: '',
      addEventListener: jest.fn(),
      remove: jest.fn(),
      querySelector: jest.fn(),
      style: {},
    })),
    body: {
      appendChild: jest.fn(),
      removeChild: jest.fn(),
      querySelector: jest.fn(),
      contains: jest.fn(),
    },
    getElementById: jest.fn((id) => elements.get(id) ?? null),
    querySelector: jest.fn(),
    registerElement(id, element) {
      elements.set(id, element);
    },
  };

  return documentStub;
};

describe('TrekkoAuth guide registration flow', () => {
  let TrekkoAuth;
  let documentStub;
  let validationElement;

  beforeAll(() => {
    documentStub = createDocumentStub();
    validationElement = { innerHTML: '' };
    documentStub.registerElement('cadastur-validation', validationElement);
    global.document = documentStub;
    global.window = {
      trekkoAuth: undefined,
      location: { reload: jest.fn() },
    };
    const storage = {};
    global.localStorage = {
      setItem: jest.fn((key, value) => {
        storage[key] = value;
      }),
      getItem: jest.fn((key) => storage[key] ?? null),
      removeItem: jest.fn((key) => {
        delete storage[key];
      }),
      clear: jest.fn(() => {
        Object.keys(storage).forEach((key) => delete storage[key]);
      }),
    };

    global.FormData = class {
      constructor(form) {
        this._entries = form.__mockEntries ?? [];
      }

      entries() {
        return this._entries[Symbol.iterator]();
      }

      [Symbol.iterator]() {
        return this.entries();
      }
    };

    TrekkoAuth = require('../new_auth.js');
  });

  beforeEach(() => {
    validationElement.innerHTML = '';
    documentStub.body.appendChild.mockClear();
    documentStub.addEventListener.mockClear();
  });

  afterAll(() => {
    delete global.document;
    delete global.window;
    delete global.localStorage;
    delete global.FormData;
  });

  test('validateCadasturAPI sends name and CADASTUR number to the backend', async () => {
    const auth = new TrekkoAuth();
    auth.apiUrl = 'https://example.test/api/auth';

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ valid: true }),
    });

    const isValid = await auth.validateCadasturAPI('12345678901', 'Maria Guia');

    expect(global.fetch).toHaveBeenCalledWith(
      'https://example.test/api/auth/validate-cadastur',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      }),
    );
    const requestBody = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(requestBody).toEqual({ name: 'Maria Guia', cadastur_number: '12345678901' });
    expect(isValid).toBe(true);
    expect(validationElement.innerHTML).toContain('✅ CADASTUR válido');
  });

  test('handleRegister submits guide registration when CADASTUR is valid', async () => {
    const auth = new TrekkoAuth();
    auth.apiUrl = 'https://example.test/api/auth';
    auth.validateCadasturAPI = jest.fn().mockResolvedValue(true);
    auth.updateUIForLoggedUser = jest.fn();
    auth.showSuccess = jest.fn();

    const submitButton = { disabled: false, textContent: 'Cadastrar', id: '' };

    const form = {
      __mockEntries: [
        ['name', ' Maria Guia '],
        ['email', 'maria@example.com'],
        ['password', 'strongpass'],
        ['user_type', 'guia'],
        ['cadastur_number', ' 12345678901 '],
      ],
      querySelector: jest.fn(() => submitButton),
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, user: { id: '1', name: 'Maria Guia', user_type: 'guia' } }),
    });

    const modal = { remove: jest.fn() };

    await auth.handleRegister(form, modal);

    expect(auth.validateCadasturAPI).toHaveBeenCalledWith('12345678901', 'Maria Guia');
    expect(global.fetch).toHaveBeenCalledWith('https://example.test/api/auth/register', expect.objectContaining({
      method: 'POST',
      credentials: 'include',
      headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
    }));

    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body).toMatchObject({
      name: 'Maria Guia',
      email: 'maria@example.com',
      password: 'strongpass',
      user_type: 'guia',
      cadastur_number: '12345678901',
    });

    expect(auth.showSuccess).toHaveBeenCalled();
    expect(auth.session.user).toMatchObject({
      id: '1',
      name: 'Maria Guia',
      user_type: 'guia',
    });
    expect(modal.remove).toHaveBeenCalled();
  });
});
