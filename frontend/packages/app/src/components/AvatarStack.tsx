import { Avatar } from "./Avatar";

interface AvatarStackProps {
  people: { initials: string; color: string }[];
  size?: number;
}

export function AvatarStack({ people, size = 22 }: AvatarStackProps) {
  return (
    <div className="flex">
      {people.map((p, i) => (
        <div key={i} style={{ marginLeft: i === 0 ? 0 : -size * 0.35 }} className="rounded-full border-2 border-white">
          <Avatar initials={p.initials} color={p.color} size={size} />
        </div>
      ))}
    </div>
  );
}
