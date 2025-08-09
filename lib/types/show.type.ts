export interface AppShow {
  title: string;
  description: string;
  img: string;
  theatre: string;
  venue: string;
  price: number;
  date: number | string | Date;
  story?: string;
  slug?: string;
}
