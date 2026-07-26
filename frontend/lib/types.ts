export type Role = 'contractor' | 'admin';

export type User = {
  id: number;
  email: string;
  role: Role;
};

export type TenderStatus = 'draft' | 'open' | 'review' | 'closed' | 'won';
export type ApplicationStatus = 'submitted' | 'under_review' | 'won' | 'rejected';

export type Tender = {
  id: number;
  public_code: string | null;
  title: string;
  description?: string;
  category: string | null;
  sum: string | null;
  deadline: string | null;
  status: TenderStatus;
  source: 'manual' | 'parsed';
  requirements?: string | null;
  winner_contractor_id?: number | null;
  winner_company_name?: string | null;
  created_at: string;
  updated_at: string;
};

export type TenderAttachment = {
  id: number;
  original_name: string;
  uploaded_at: string;
};

export type Application = {
  id: number;
  tender_id: number;
  contractor_id: number;
  proposed_price: string | null;
  comment: string | null;
  status: ApplicationStatus;
  submitted_at: string;
  updated_at: string;
  tender_title?: string;
  tender_public_code?: string;
  tender_status?: TenderStatus;
  tender_deadline?: string | null;
  company_name?: string;
  inn?: string;
  phone?: string;
  contact_person?: string;
  specialization?: string;
};

export type ContractorProfile = {
  id: number;
  user_id: number;
  company_name: string;
  inn: string;
  specialization: string;
  phone: string;
  contact_person: string;
  about: string | null;
  created_at: string;
};

export type TenderSourceRaw = {
  id: number;
  telegram_message_id: string;
  raw_text: string | null;
  raw_media_paths: string | null;
  parsed_title: string | null;
  parsed_sum: string | null;
  parsed_deadline: string | null;
  status: 'pending' | 'approved' | 'rejected';
  linked_tender_id: number | null;
  fetched_at: string;
};
