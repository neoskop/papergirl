export interface Redirect {
  from: string;
  to: string;
  regex?: boolean;
  code?: '301' | '302' | '307' | 301 | 302 | 307;
  site?: string;
}
