import { useRef, useState } from "react";
import {
  UploadCloud,
  ScanLine,
  Wand2,
  BellRing,
  Plus,
  X,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useStore, patch, getState } from "@/lib/store";
import { DAYS, toMin, uid, nextClass } from "@/lib/time";
import { colorFor } from "@/lib/seed";
import { ocrTimetable, SIMULATED_OCR } from "@/lib/zero";
import { requestNotifyPermission } from "@/lib/notify";
import { fireClassAlert } from "@/components/AlertEngine";
import { Bento, Eyebrow, PageHead, Btn, Field, Tag } from "@/components/ui-kit";

const START = 8 * 60,
  END = 18 * 60,
  PX = 0.9;
const GRID_DAYS = [1, 2, 3, 4, 5, 6];

function Scanner() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const inp = useRef();
  const take = (f) => {
    if (!f?.type?.startsWith("image/"))
      return toast.error("Drop an image (PNG/JPG)");
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };
  const scan = async () => {
    setBusy(true);
    try {
      const r = await ocrTimetable(file, getState());
      setRows((r || []).map((x) => ({ ...x, day: Number(x.day), id: uid() })));
      toast.success(`Extracted ${r.length} classes`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || e.message);
    } finally {
      setBusy(false);
    }
  };
  const simulate = () => {
    setRows(SIMULATED_OCR.map((x) => ({ ...x, id: uid() })));
    toast.success("Simulated OCR: 5 classes extracted");
  };
  const apply = () => {
    patch("timetable", (t) => [...t, ...rows]);
    toast.success(`${rows.length} classes added to timetable`);
    setRows([]);
  };
  return (
    <Bento data-testid="ocr-scanner">
      <div className="flex items-center justify-between mb-4">
        <Eyebrow className="text-cyan-400">Timetable OCR Scanner</Eyebrow>
        <ScanLine className="h-4 w-4 text-cyan-400" />
      </div>
      <div
        data-testid="ocr-dropzone"
        onClick={() => inp.current.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          take(e.dataTransfer.files[0]);
        }}
        className={`press cursor-pointer rounded-xl border border-dashed h-40 grid place-items-center text-center overflow-hidden relative ${drag ? "border-cyan-400 bg-cyan-500/5" : "border-white/15 hover:border-cyan-500/40"}`}
      >
        {preview ? (
          <img
            src={preview}
            alt="timetable"
            className="absolute inset-0 w-full h-full object-cover opacity-50"
          />
        ) : null}
        <div className="relative">
          <UploadCloud className="h-6 w-6 mx-auto text-slate-400 mb-2" />
          <div className="text-sm">
            {file ? file.name : "Drop your class roster screenshot"}
          </div>
          <div className="text-[11px] text-slate-500">
            PNG / JPG · stored securely in your file vault
          </div>
        </div>
        <input
          ref={inp}
          type="file"
          accept="image/*"
          hidden
          data-testid="ocr-file-input"
          onChange={(e) => take(e.target.files[0])}
        />
      </div>
      <div className="flex gap-2 mt-3">
        <Btn
          tone="primary"
          data-testid="ocr-scan-btn"
          disabled={!file || busy}
          onClick={scan}
          className="flex-1"
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <ScanLine className="h-3.5 w-3.5" />
          )}{" "}
          Scan with Zero Vision
        </Btn>
        <Btn
          data-testid="ocr-simulate-btn"
          onClick={simulate}
          className="flex-1"
        >
          <Wand2 className="h-3.5 w-3.5" /> Simulate OCR Extraction
        </Btn>
      </div>
      {rows.length > 0 && (
        <div className="mt-4 fade-up" data-testid="ocr-results">
          <div className="max-h-56 overflow-y-auto rounded-lg border border-white/10">
            <table className="w-full text-xs">
              <thead className="text-slate-500">
                <tr>
                  {["Code", "Subject", "Day", "Time", "Room", ""].map((h) => (
                    <th key={h} className="text-left font-medium px-2 py-2">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-white/5">
                    <td
                      className="px-2 py-1.5 mono"
                      style={{ color: colorFor(r.code) }}
                    >
                      {r.code}
                    </td>
                    <td className="px-2 truncate max-w-[140px]">{r.name}</td>
                    <td className="px-2">{DAYS[r.day]}</td>
                    <td className="px-2 mono">
                      {r.start}–{r.end}
                    </td>
                    <td className="px-2 text-slate-400">{r.room}</td>
                    <td className="px-2">
                      <button
                        onClick={() =>
                          setRows((x) => x.filter((y) => y.id !== r.id))
                        }
                        className="text-slate-600 hover:text-red-400"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Btn
            tone="emerald"
            data-testid="ocr-apply-btn"
            onClick={apply}
            className="w-full mt-2"
          >
            Apply {rows.length} classes to timetable
          </Btn>
        </div>
      )}
    </Bento>
  );
}

function AlertPanel() {
  const test = () => {
    const n = nextClass(getState().timetable);
    if (n) fireClassAlert(n.cls);
    else toast("No classes scheduled");
  };
  return (
    <Bento data-testid="class-alert-engine">
      <div className="flex items-center justify-between mb-2">
        <Eyebrow className="text-amber-400">15-Min Class Alert Engine</Eyebrow>
        <span className="flex items-center gap-1.5 text-[10px] mono text-emerald-400">
          <span className="dot bg-emerald-400" /> ARMED
        </span>
      </div>
      <p className="text-xs text-slate-400 mb-4">
        Runs on your device clock every 20s — fires an in-app + device
        notification 15 minutes before every class or lab, even offline.
      </p>
      <div className="flex gap-2">
        <Btn
          tone="amber"
          data-testid="test-class-alert-btn"
          onClick={test}
          className="flex-1"
        >
          <BellRing className="h-3.5 w-3.5" /> Test 15-Min Class Alert Now
        </Btn>
        <Btn
          data-testid="enable-notifications-btn"
          onClick={requestNotifyPermission}
        >
          Enable device alerts
        </Btn>
      </div>
    </Bento>
  );
}

function AddClass() {
  const [f, setF] = useState({
    code: "",
    name: "",
    day: 1,
    start: "09:00",
    end: "10:00",
    room: "",
    type: "lecture",
  });
  const set = (k) => (e) =>
    setF({ ...f, [k]: k === "day" ? Number(e.target.value) : e.target.value });
  const add = (e) => {
    e.preventDefault();
    if (!f.code || !f.name || toMin(f.end) <= toMin(f.start))
      return toast.error("Fill code, subject and a valid time range");
    patch("timetable", (t) => [...t, { ...f, id: uid() }]);
    toast.success("Class added");
  };
  return (
    <Bento>
      <Eyebrow className="mb-3">Add Class Manually</Eyebrow>
      <form onSubmit={add} className="grid grid-cols-2 gap-2">
        <Field
          data-testid="class-code-input"
          placeholder="Code (CS301)"
          value={f.code}
          onChange={set("code")}
        />
        <Field
          data-testid="class-room-input"
          placeholder="Room"
          value={f.room}
          onChange={set("room")}
        />
        <Field
          data-testid="class-name-input"
          placeholder="Subject name"
          value={f.name}
          onChange={set("name")}
          className="col-span-2"
        />
        <select
          data-testid="class-day-select"
          value={f.day}
          onChange={set("day")}
          className="h-9 px-2 rounded-lg bg-[#06080E] border border-white/10 text-sm"
        >
          {DAYS.map((d, i) => (
            <option key={d} value={i}>
              {d}
            </option>
          ))}
        </select>
        <select
          value={f.type}
          onChange={set("type")}
          className="h-9 px-2 rounded-lg bg-[#06080E] border border-white/10 text-sm"
        >
          <option value="lecture">Lecture</option>
          <option value="lab">Lab</option>
        </select>
        <Field
          type="time"
          value={f.start}
          onChange={set("start")}
          className="mono"
        />
        <Field
          type="time"
          value={f.end}
          onChange={set("end")}
          className="mono"
        />
        <Btn tone="primary" data-testid="class-add-btn" className="col-span-2">
          <Plus className="h-3.5 w-3.5" /> Add to timetable
        </Btn>
      </form>
    </Bento>
  );
}

function WeekGrid() {
  const tt = useStore((s) => s.timetable);
  const today = new Date().getDay();
  const del = (id) => patch("timetable", (t) => t.filter((c) => c.id !== id));
  const hours = Array.from(
    { length: (END - START) / 60 + 1 },
    (_, i) => START / 60 + i,
  );
  return (
    <Bento className="overflow-x-auto" data-testid="weekly-timetable-grid">
      <div className="flex items-center justify-between mb-4">
        <Eyebrow>Weekly Grid</Eyebrow>
        <span className="text-[10px] mono text-slate-600">
          {tt.length} sessions · click × to remove
        </span>
      </div>
      <div
        className="grid min-w-[760px]"
        style={{ gridTemplateColumns: `48px repeat(${GRID_DAYS.length}, 1fr)` }}
      >
        <div />
        {GRID_DAYS.map((d) => (
          <div
            key={d}
            className={`text-xs font-semibold pb-2 text-center ${d === today ? "text-cyan-300" : "text-slate-400"}`}
          >
            {DAYS[d]}
            {d === today && " ·"}
          </div>
        ))}
        <div className="relative" style={{ height: (END - START) * PX }}>
          {hours.map((h) => (
            <div
              key={h}
              className="absolute right-2 text-[10px] mono text-slate-600 -translate-y-1/2"
              style={{ top: (h * 60 - START) * PX }}
            >
              {String(h).padStart(2, "0")}
            </div>
          ))}
        </div>
        {GRID_DAYS.map((d) => (
          <div
            key={d}
            className={`relative border-l border-white/[0.05] ${d === today ? "bg-cyan-500/[0.03]" : ""}`}
            style={{ height: (END - START) * PX }}
          >
            {hours.map((h) => (
              <div
                key={h}
                className="absolute inset-x-0 border-t border-white/[0.04]"
                style={{ top: (h * 60 - START) * PX }}
              />
            ))}
            {tt
              .filter((c) => c.day === d)
              .map((c) => {
                const col = colorFor(c.code);
                const top = Math.max(0, toMin(c.start) - START) * PX;
                const h = (toMin(c.end) - toMin(c.start)) * PX - 3;
                return (
                  <div
                    key={c.id}
                    data-testid="timetable-block"
                    className="group absolute inset-x-1 rounded-md p-1.5 overflow-hidden"
                    style={{
                      top,
                      height: h,
                      background: `${col}1f`,
                      borderLeft: `2px solid ${col}`,
                    }}
                  >
                    <div className="flex items-center gap-1">
                      <span
                        className="mono text-[10px] font-bold"
                        style={{ color: col }}
                      >
                        {c.code}
                      </span>
                      {c.type === "lab" && (
                        <Tag className="!h-4 !px-1">lab</Tag>
                      )}
                      <button
                        onClick={() => del(c.id)}
                        className="ml-auto opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-400"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="text-[11px] leading-tight text-slate-200 truncate">
                      {c.name}
                    </div>
                    <div className="text-[10px] mono text-slate-500">
                      {c.start} · {c.room}
                    </div>
                  </div>
                );
              })}
          </div>
        ))}
      </div>
    </Bento>
  );
}

export default function Timetable() {
  return (
    <div>
      <PageHead
        eyebrow="Module B"
        title="Smart Timetable"
        sub="Scan a timetable screenshot, fine-tune the weekly grid, and let the 15-minute alert engine guard every class."
      />
      <div className="grid xl:grid-cols-[1fr_380px] gap-4">
        <WeekGrid />
        <div className="space-y-4">
          <Scanner />
          <AlertPanel />
          <AddClass />
        </div>
      </div>
    </div>
  );
}
