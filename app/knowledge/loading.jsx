import LoadingSkeleton from "@/components/LoadingSkeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="animate-pulse space-y-3">
          <div className="h-8 bg-slate-800 rounded-xl w-64" />
          <div className="h-4 bg-slate-800/60 rounded-lg w-96" />
        </div>
        <LoadingSkeleton count={6} />
      </div>
    </div>
  );
}
