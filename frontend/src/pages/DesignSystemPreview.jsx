import { useState } from "react";
import TrueToneLogo from "../components/TrueToneLogo";
import {
  Button,
  Input,
  Textarea,
  Select,
  PageHeader,
  ReportPanel,
  Verdict,
  ScoreLabel,
  DataTable,
  Modal,
  EmptyState,
  InlineAlert,
} from "../components/ui";

/**
 * Temporary Clinical component gallery for Step 1 review.
 * Not part of the product nav. Remove after redesign approval if desired.
 */
const sampleRows = [
  { id: 1, name: "Fragrance", note: "Matches your allergy.", level: "avoid" },
  { id: 2, name: "Alcohol denat.", note: "Drying on oily acne skin.", level: "caution" },
  { id: 3, name: "Niacinamide", note: "Suits oily, acne-prone skin.", level: "safe" },
  { id: 4, name: "Adapalene", note: "Common acne treatment.", level: "safe" },
];

const columns = [
  { key: "name", header: "Ingredient" },
  {
    key: "verdict",
    header: "Verdict",
    render: (row) => <Verdict level={row.level} />,
  },
  { key: "note", header: "Note" },
];

const DesignSystemPreview = () => {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--tt-paper)] px-4 py-8 text-[var(--tt-ink)] sm:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--tt-border)] pb-4">
          <TrueToneLogo />
          <p className="text-sm text-[var(--tt-secondary)]">
            Step 1 preview · Clinical tokens and shared components · sample content only
          </p>
        </div>

        <PageHeader
          title="Clinical design system"
          subtitle="Shared components for every TrueTone screen. Approve this step before the sidebar or pages are touched."
          actions={
            <>
              <Button variant="secondary" onClick={() => setModalOpen(true)}>
                Open modal
              </Button>
              <Button variant="primary">Primary action</Button>
            </>
          }
        />

        <div className="grid items-start gap-4 md:grid-cols-2">
          <ReportPanel title="Controls">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button variant="primary">Scan product</Button>
                <Button variant="secondary">Cancel</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="danger">Danger</Button>
              </div>
              <Input placeholder="Search products" />
              <Select defaultValue="">
                <option value="" disabled>
                  Filter by category
                </option>
                <option value="cleanser">Cleanser</option>
                <option value="treatment">Treatment</option>
              </Select>
              <Textarea placeholder="Optional notes" rows={3} />
            </div>
          </ReportPanel>

          <ReportPanel title="Scores and verdicts" className="self-start">
            <div className="flex flex-wrap items-start gap-6">
              <ScoreLabel value="0.61" label="Profile score" rangeText="0 to 1" size="lg" />
              <ScoreLabel value="6.5" label="Match" rangeText="0 to 10" size="lg" />
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm leading-snug">
              <span>
                Fragrance · <Verdict level="avoid" />
              </span>
              <span>
                Alcohol denat. · <Verdict level="caution" />
              </span>
              <span>
                Niacinamide · <Verdict level="safe" />
              </span>
            </div>
          </ReportPanel>
        </div>

        <ReportPanel title="Acnedol Anti acne Serum 15ml · sample table">
          <DataTable columns={columns} rows={sampleRows} />
        </ReportPanel>

        <div className="grid gap-4 md:grid-cols-2">
          <ReportPanel title="Alerts">
            <div className="space-y-2">
              <InlineAlert tone="loading">Loading profile…</InlineAlert>
              <InlineAlert tone="info">Your allergies stay as they are.</InlineAlert>
              <InlineAlert tone="error">Failed to extract ingredients clearly from the image.</InlineAlert>
            </div>
          </ReportPanel>
          <EmptyState
            title="No scans yet"
            description="Capture a face photo to build your profile."
            actionLabel="Start skin analysis"
            onAction={() => {}}
          />
        </div>

        <ReportPanel title="Typography">
          <p className="text-2xl font-semibold">Heading · IBM Plex Sans 600</p>
          <p className="mt-2 text-sm text-[var(--tt-secondary)]">
            Secondary copy uses #475569 for contrast on paper backgrounds.
          </p>
          <p className="tt-mono mt-3 text-sm">Mono sample · 0.61 · 78% · matrix cells</p>
        </ReportPanel>
      </div>

      <Modal
        open={modalOpen}
        title="Update skin condition?"
        secondaryLabel="No"
        primaryLabel="Yes"
        onClose={() => setModalOpen(false)}
        onPrimary={() => setModalOpen(false)}
      >
        Your allergies stay as they are. Yes updates disease only for this confirm flow sample.
      </Modal>
    </div>
  );
};

export default DesignSystemPreview;
