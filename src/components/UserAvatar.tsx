export default function UserAvatar({ name }: { name: string }) {
  // Get Initials (e.g. "Jane Doe" -> "JD")
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Generate a consistent color from the name string
  const colors = [
    "bg-red-100 text-red-700",
    "bg-orange-100 text-orange-700",
    "bg-amber-100 text-amber-700",
    "bg-green-100 text-green-700",
    "bg-emerald-100 text-emerald-700",
    "bg-teal-100 text-teal-700",
    "bg-cyan-100 text-cyan-700",
    "bg-blue-100 text-blue-700",
    "bg-indigo-100 text-indigo-700",
    "bg-violet-100 text-violet-700",
    "bg-purple-100 text-purple-700",
    "bg-fuchsia-100 text-fuchsia-700",
    "bg-pink-100 text-pink-700",
    "bg-rose-100 text-rose-700",
  ];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colorClass = colors[Math.abs(hash) % colors.length];

  return (
    <div
      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 border-white shadow-sm ${colorClass}`}
      title={name}
    >
      {initials}
    </div>
  );
}
