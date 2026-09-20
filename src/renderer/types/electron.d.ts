import { AudioXApi } from '../../preload/api';

declare global {
  interface Window {
    audiox: AudioXApi;
  }
}

export {};
