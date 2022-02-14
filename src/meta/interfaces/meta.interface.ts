import { Redirect } from './redirect.interface';
import { Site } from './site.interface';

export interface Meta {
  imageProcessing?: {
    enabled: boolean;
    quality?: number;
    imageType?: 'original' | 'auto';
  };
  cache?: {
    headers: boolean;
  };
  security?: {
    csp?: string;
    standardHeaders?: boolean;
    hideVersion?: boolean;
  };
  removeTrailingSlash?: boolean;
  redirects?: Redirect[];
  multisite?: {
    enabled: boolean;
    sites?: Site[];
  };
}
