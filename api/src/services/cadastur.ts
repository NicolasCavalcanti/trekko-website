export interface CadasturGuide {
  id: string;
  name: string;
  registryNumber: string;
  expiresAt: Date;
}

export class CadasturService {
  constructor(private readonly baseUrl: string, private readonly apiKey?: string) {}

  async fetchGuide(registryNumber: string): Promise<CadasturGuide | null> {
    void this.apiKey;
    void this.baseUrl;

    return {
      id: registryNumber,
      name: 'Placeholder Guide',
      registryNumber,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    };
  }
}
