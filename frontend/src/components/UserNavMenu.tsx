"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown, LogOut, User, Trophy, Mail, Pencil,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import ProfileEditModal from "./ProfileEditModal";
import ModalPortal from "./ModalPortal";
import UserAvatar from "./UserAvatar";

export default function UserNavMenu() {
  const { user, logout, updateProfile } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 56, right: 16 });
  const rootRef = useRef<HTMLDivElement>(null);

  const updateMenuPos = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setMenuPos({
      top: rect.bottom + 8,
      right: Math.max(12, window.innerWidth - rect.right),
    });
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    updateMenuPos();
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      const menu = document.getElementById("user-nav-menu-portal");
      if (menu?.contains(target)) return;
      setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    const onLayout = () => updateMenuPos();
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onLayout);
    window.addEventListener("scroll", onLayout, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onLayout);
      window.removeEventListener("scroll", onLayout, true);
    };
  }, [menuOpen, updateMenuPos]);

  const handleSaveProfile = useCallback(
    async (input: { username: string; displayName: string }) => {
      if (!user) return "Not logged in";
      return updateProfile(input);
    },
    [user, updateProfile]
  );

  if (!user) return null;

  const initials = user.displayName
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      <div className="user-nav" ref={rootRef}>
        <button
          type="button"
          className={`user-nav__trigger ${menuOpen ? "is-open" : ""}`}
          onClick={() => {
            setMenuOpen((o) => {
              if (!o) updateMenuPos();
              return !o;
            });
          }}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
        >
          <span className="user-nav__avatar-wrap">
            <UserAvatar
              src={user.avatarUrl}
              className="user-nav__avatar"
              fallback={
                <span className="user-nav__avatar user-nav__avatar--fallback">
                  {initials || <User className="w-4 h-4" strokeWidth={2.5} />}
                </span>
              }
            />
            <span className="user-nav__status" aria-hidden />
          </span>

          <span className="user-nav__labels">
            <span className="user-nav__name">{user.displayName}</span>
            <span className="user-nav__handle">@{user.username}</span>
          </span>

          <ChevronDown className="user-nav__chevron" strokeWidth={2.5} />
        </button>

        <AnimatePresence>
          {menuOpen && (
            <ModalPortal>
            <motion.div
              id="user-nav-menu-portal"
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
              className="user-nav__menu user-nav__menu--portal"
              role="menu"
              style={{ top: menuPos.top, right: menuPos.right }}
            >
              <div className="user-nav__menu-hero">
                <div className="user-nav__menu-hero-bg" aria-hidden />
                <UserAvatar
                  src={user.avatarUrl}
                  className="user-nav__menu-avatar"
                  fallback={
                    <span className="user-nav__menu-avatar user-nav__avatar--fallback">{initials}</span>
                  }
                />
                <p className="user-nav__menu-name">{user.displayName}</p>
                <p className="user-nav__menu-handle">@{user.username}</p>
              </div>

              {user.email && (
                <div className="user-nav__menu-row">
                  <Mail className="w-4 h-4 shrink-0 opacity-45" />
                  <span className="truncate">{user.email}</span>
                </div>
              )}

              <div className="user-nav__stats">
                <div className="user-nav__stat">
                  <Trophy className="w-4 h-4 text-[#d4a853]" />
                  <span className="user-nav__stat-val">{user.stats.elo}</span>
                  <span className="user-nav__stat-lbl">ELO</span>
                </div>
                <div className="user-nav__stat-divider" />
                <div className="user-nav__stat user-nav__stat--record">
                  <span className="user-nav__stat-val text-[#81b64c]">{user.stats.wins}W</span>
                  <span className="user-nav__stat-val text-red-400">{user.stats.losses}L</span>
                  <span className="user-nav__stat-val text-white/40">{user.stats.draws}D</span>
                </div>
              </div>

              <div className="user-nav__menu-actions">
                <button
                  type="button"
                  role="menuitem"
                  className="user-nav__action user-nav__action--primary"
                  onClick={() => {
                    setMenuOpen(false);
                    setEditOpen(true);
                  }}
                >
                  <Pencil className="w-4 h-4" />
                  Edit profile
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="user-nav__action user-nav__action--danger"
                  onClick={() => {
                    setMenuOpen(false);
                    logout();
                  }}
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            </motion.div>
            </ModalPortal>
          )}
        </AnimatePresence>
      </div>

      <ProfileEditModal
        open={editOpen}
        user={user}
        onClose={() => setEditOpen(false)}
        onSave={handleSaveProfile}
      />
    </>
  );
}
