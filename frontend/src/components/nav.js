import {
  Home,
  CalendarClock,
  Bot,
  GraduationCap,
  Code2,
  HeartPulse,
  Radio,
  Settings,
} from "lucide-react";

export const NAV = [
  { id: "home", to: "/", label: "Command", icon: Home },
  {
    id: "timetable",
    to: "/timetable",
    label: "Timetable",
    icon: CalendarClock,
  },
  { id: "zero", to: "/zero", label: "Zero AI", icon: Bot },
  {
    id: "academics",
    to: "/academics",
    label: "Academics",
    icon: GraduationCap,
  },
  { id: "coding", to: "/coding", label: "Code & ML", icon: Code2 },
  { id: "health", to: "/health", label: "Bio-Perf", icon: HeartPulse },
  { id: "ops", to: "/ops", label: "Ops & Creator", icon: Radio },
  { id: "settings", to: "/settings", label: "Settings", icon: Settings },
];
