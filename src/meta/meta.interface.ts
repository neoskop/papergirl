export interface Meta {
  security?: {
    csp?: string;
    standardHeaders?: boolean;
    hideVersion?: boolean;
  };
  redirects?: {
    from: string;
    to: string;
    regex?: boolean;
    code?: '301' | '302' | '307';
  }[];
}
