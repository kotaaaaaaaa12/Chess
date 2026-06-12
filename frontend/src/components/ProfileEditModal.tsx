"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { X, Loader2, UserPen } from "lucide-react";
import type { AuthUser } from "@/lib/auth/types";
import ModalPortal from "./ModalPortal";

interface ProfileEditModalProps {
  open: boolean;
  user: AuthUser;
  onClose: () => void;
  onSave: (input: { username: string; displayName: string }) => Promise<string | null>;
}

export default function ProfileEditModal({
  open, user, onClose, onSave,
}: ProfileEditModalProps) {
  const [username, setUsername] = useState(user.username);
  const [displayName, setDisplayName] = useState(user.displayName);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setUsername(user.username);
      setDisplayName(user.displayName);
      setError(null);
    }
  }, [open, user.username, user.displayName]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const handleSubmit = async () => {
    setError(null);
    setBusy(true);
    try {
      const err = await onSave({
        username: username.trim().toLowerCase(),
        displayName: displayName.trim(),
      });
      if (err) {
        setError(err);
        return;
      }
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalPortal>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="modal-shell profile-edit-overlay"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.94, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 380, damping: 28 }}
          className="profile-edit-modal my-auto"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-edit-title"
        >
          <div className="profile-edit-modal__header">
            <div className="flex items-center gap-2.5">
              <span className="profile-edit-modal__icon">
                <UserPen className="w-4 h-4" />
              </span>
              <div>
                <h2 id="profile-edit-title" className="profile-edit-modal__title">Edit Profile</h2>
                <p className="profile-edit-modal__subtitle">Update how others see you</p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="btn-icon" disabled={busy} aria-label="Close">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="profile-edit-modal__body">
            <label className="profile-edit-field">
              <span className="profile-edit-field__label">Username</span>
              <div className="profile-edit-field__input-wrap">
                <span className="profile-edit-field__prefix">@</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                  placeholder="your_username"
                  maxLength={32}
                  disabled={busy}
                  autoComplete="username"
                />
              </div>
              <span className="profile-edit-field__hint">Letters, numbers, underscore · min 3 characters</span>
            </label>

            <label className="profile-edit-field">
              <span className="profile-edit-field__label">Display name</span>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                maxLength={64}
                disabled={busy}
                autoComplete="name"
              />
              <span className="profile-edit-field__hint">Shown on your profile and in games</span>
            </label>

            {error && <p className="profile-edit-modal__error">{error}</p>}
          </div>

          <div className="profile-edit-modal__footer">
            <button type="button" onClick={onClose} className="btn-ghost flex-1 py-2.5" disabled={busy}>
              Cancel
            </button>
            <button type="button" onClick={handleSubmit} className="btn-primary flex-1 py-2.5" disabled={busy}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Save changes"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </ModalPortal>
  );
}
