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
  redirects?: {
    from: string;
    to: string;
    regex?: boolean;
    code?: '301' | '302' | '307';
  }[];
}
