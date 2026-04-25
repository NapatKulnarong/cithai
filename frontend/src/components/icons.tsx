import {
  ArrowUpOnSquareIcon,
  TrashIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  MusicalNoteIcon,
  RectangleStackIcon,
  EyeIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/outline";
import { PauseIcon, PlayIcon } from "@heroicons/react/24/solid";

export function VinylIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="currentColor" opacity="0.24" />
      <circle cx="12" cy="12" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}

export function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 2 14.2 8.1 20.5 10 14.2 11.9 12 18 9.8 11.9 3.5 10l6.3-1.9L12 2Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function LibraryIcon() {
  return <RectangleStackIcon aria-hidden="true" />;
}

export function PulseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M3 12h4l2-5 4 10 2-5h6"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

export function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M20.3 12.2c0-.7-.1-1.3-.2-1.9H12v3.6h4.6a4 4 0 0 1-1.7 2.6v2.9h2.8c1.6-1.5 2.6-4 2.6-7.2Z"
        fill="currentColor"
      />
      <path
        d="M12 20.5c2.4 0 4.4-.8 5.9-2.1l-2.8-2.9c-.8.6-1.8 1-3.1 1-2.4 0-4.5-1.6-5.2-3.9H3.8v3c1.5 3 4.6 4.9 8.2 4.9Z"
        fill="currentColor"
        opacity="0.78"
      />
      <path
        d="M6.8 12.6a5 5 0 0 1 0-3.2V6.4H3.8a8.6 8.6 0 0 0 0 9.2l3-3Z"
        fill="currentColor"
        opacity="0.56"
      />
      <path
        d="M12 7.4c1.3 0 2.5.4 3.4 1.3l2.6-2.6C16.4 4.5 14.4 3.5 12 3.5c-3.6 0-6.7 2-8.2 4.9l3 3C7.5 9 9.6 7.4 12 7.4Z"
        fill="currentColor"
        opacity="0.84"
      />
    </svg>
  );
}

export function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="m6 6 12 12M18 6 6 18"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

export function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M10 6H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
      <path
        d="M13 8.5 17.5 12 13 15.5M17 12H9"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 8.5A3.5 3.5 0 1 0 12 15.5 3.5 3.5 0 1 0 12 8.5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="m19.4 15-1.1 1.9 1.2 2.1-2 2-2.1-1.2L13.5 21h-3l-.9-2.2-2.1 1.2-2-2 1.2-2.1L4.6 15v-3l2.1-.9-1.2-2.1 2-2 2.1 1.2L10.5 3h3l.9 2.2 2.1-1.2 2 2-1.2 2.1 2.1.9z"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.4"
      />
    </svg>
  );
}

export function StudioIcon() {
  return <MusicalNoteIcon aria-hidden="true" />;
}

export function CompassIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="m14.8 9.2-1.9 5.6-5.7 1.9 1.9-5.7z" fill="currentColor" />
    </svg>
  );
}

export function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm-7 8a7 7 0 0 1 14 0"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function ShareIcon() {
  return <ArrowUpOnSquareIcon aria-hidden="true" />;
}

export function DeleteIcon() {
  return <TrashIcon aria-hidden="true" />;
}

export function PlayControlIcon() {
  return <PlayIcon aria-hidden="true" />;
}

export function PauseControlIcon() {
  return <PauseIcon aria-hidden="true" />;
}

export function VolumeOnIcon() {
  return <SpeakerWaveIcon aria-hidden="true" />;
}

export function VolumeOffIcon() {
  return <SpeakerXMarkIcon aria-hidden="true" />;
}

export function PublicIcon() {
  return <EyeIcon aria-hidden="true" />;
}

export function PrivateIcon() {
  return <EyeSlashIcon aria-hidden="true" />;
}
