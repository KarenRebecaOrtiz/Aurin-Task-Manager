export interface FeedbackFormState {
  feedback: string;
  isSubmitting: boolean;
  message: string;
}

export interface FeedbackFormHandlers {
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  setFeedback: (value: string) => void;
}
