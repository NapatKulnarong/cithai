export type GenerationStatus = "PENDING" | "PROCESSING" | "COMPLETE" | "FAILED";

export type User = {
  id: number;
  name: string;
  email: string;
};

export type AuthenticatedAccount = {
  name: string;
  email: string;
  image: string | null;
};

export type Song = {
  id: number;
  title: string;
  custom_lyrics: string | null;
  duration: number | null;
  is_shared: boolean;
  is_public: boolean;
  creation_date: string;
  audio_file_path: string | null;
  status: GenerationStatus;
  mood: string;
  genre: string;
  occasion: string;
  voice_type: string;
  user_id: number;
  generation_request_id: number | null;
  generation_job_id: number | null;
};

export type GenerationJob = {
  id: number;
  provider: string;
  task_id: string | null;
  status: GenerationStatus;
  audio_url: string | null;
  error_message: string | null;
  request_id: number;
  raw_response: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type GenerateResponse = {
  job: GenerationJob;
  song: Song;
};

export type ShareLink = {
  token: string;
  is_active: boolean;
  created_at: string;
  share_path: string;
  song: Song;
};

export type ShareLinkResponse = ShareLink & {
  share_url: string;
};

export type BootstrapResponse = {
  viewer: User;
  users: User[];
  songs: Song[];
  jobs: GenerationJob[];
  backend: {
    baseUrl: string;
    strategy: string;
  };
};

export type Notice = {
  tone: "success" | "error" | "info";
  text: string;
};
