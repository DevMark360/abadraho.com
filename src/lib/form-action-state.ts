export type FormActionState = {
  status: "idle" | "ok" | "error";
  message: string;
};

export const initialFormActionState: FormActionState = {
  status: "idle",
  message: "",
};
