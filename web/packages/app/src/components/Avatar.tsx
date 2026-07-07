interface AvatarProps {
  initials: string;
  color: string;
  size?: number;
}

export function Avatar({ initials, color, size = 26 }: AvatarProps) {
  return (
    <div
      className="flex items-center justify-center rounded-full font-bold text-white"
      style={{ width: size, height: size, background: color, fontSize: size * 0.4 }}
    >
      {initials}
    </div>
  );
}
