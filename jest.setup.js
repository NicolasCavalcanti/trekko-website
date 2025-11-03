afterEach(() => {
  jest.restoreAllMocks();
  if (global.fetch && 'mockClear' in global.fetch) {
    global.fetch.mockClear();
  }
});
