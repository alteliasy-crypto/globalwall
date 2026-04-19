import { MAINTENANCE_ETA } from "@/lib/version";

export const MaintenanceScreen = () => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background p-6">
      <div className="cork-board absolute inset-0 opacity-30" />
      <div className="relative max-w-lg rounded-3xl border-2 border-border bg-card p-8 text-center shadow-2xl">
        <div className="mb-4 text-7xl animate-pulse" role="img" aria-label="nervous sweating">
          😅
        </div>
        <h1 className="font-handwritten text-4xl font-bold text-foreground">
          hey! so..
        </h1>
        <p className="mt-3 font-note text-lg leading-relaxed text-foreground">
          we're currently working on the website right now, but!
          <br />
          heres the good news — its will only take{" "}
          <span className="rounded-md bg-primary/15 px-2 py-0.5 font-bold text-primary">
            {MAINTENANCE_ETA}
          </span>
        </p>
        <p className="mt-6 font-handwritten text-base text-muted-foreground">
          thanks for your patience 💛
        </p>
      </div>
    </div>
  );
};
