import { Injectable } from '@angular/core';

interface ApiResponse<T> {
  error: boolean;
  msg?: string;
  data: T;
}

@Injectable({ providedIn: 'root' })
export class DirectoryLocations {
  private readonly baseUrl = 'https://countriesnow.space/api/v0.1';
  private countriesRequest: Promise<string[]> | null = null;

  getCountries(): Promise<string[]> {
    if (!this.countriesRequest) {
      this.countriesRequest = this.request<ApiResponse<{ name: string }[]>>(`${this.baseUrl}/countries/iso`)
        .then((response) => {
          if (response.error || !Array.isArray(response.data)) {
            throw new Error(response.msg || 'The country list could not be loaded.');
          }
          return response.data.map(({ name }) => name).filter((name) => typeof name === 'string').sort((a, b) => a.localeCompare(b));
        })
        .catch((error: unknown) => {
          this.countriesRequest = null;
          throw error;
        });
    }
    return this.countriesRequest;
  }

  private async request<T>(url: string, init?: RequestInit): Promise<T> {
    let response: Response;
    try {
      response = await fetch(url, init);
    } catch {
      throw new Error('The location service is unavailable. Check your internet connection and try again.');
    }
    if (!response.ok) {
      throw new Error(`The location service returned an error (${response.status}).`);
    }

    try {
      return await response.json() as T;
    } catch {
      throw new Error('The location service returned an invalid response.');
    }
  }
}
