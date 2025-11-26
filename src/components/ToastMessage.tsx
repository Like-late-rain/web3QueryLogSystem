import React from "react";

interface ToastMessageProps {
  message: string;
  type?: "success" | "info";
  onClose?: () => void;
}

export default function ToastMessage({ message, type = "success" }: ToastMessageProps) {
  return (
    <div className={`toast-message toast-${type}`}>
      <p>{message}</p>
    </div>
  );
}
