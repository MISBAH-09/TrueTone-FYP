const colors = {
  ink: "#2A1D18",
  secondary: "#724D3E",
  line: "#B99C8A",
  border: "#EDE1D6",
  cream: "#FAF7F4",
  blueFill: "#F0F8FD",
  blueStroke: "#38A7E8",
  greenFill: "#EFFAF4",
  greenStroke: "#20B889",
  amberFill: "#FFFAEC",
  amberStroke: "#F2A20A",
  purpleFill: "#F6F1FF",
  purpleStroke: "#9660F5",
};

function Box({ x, y, width, height, title, detail, fill, stroke }) {
  const compact = height < 80;
  const titleLines = Array.isArray(title) ? title : [title];
  const detailLines = Array.isArray(detail) ? detail : [detail];
  const titleY = y + (compact ? 24 : 37);
  const detailY =
    y + (compact ? 48 : titleLines.length > 1 ? 82 : 69);

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx="16"
        fill={fill}
        stroke={stroke}
        strokeWidth="2"
      />
      {titleLines.map((line, index) => (
        <text
          key={`title-${line}`}
          x={x + width / 2}
          y={titleY + index * 25}
          textAnchor="middle"
          fill={colors.ink}
          fontSize={compact ? "27" : "28"}
          fontWeight="650"
        >
          {line}
        </text>
      ))}
      {detailLines.map((line, index) => (
        <text
          key={`detail-${line}`}
          x={x + width / 2}
          y={detailY + index * 21}
          textAnchor="middle"
          fill={colors.secondary}
          fontSize="23"
        >
          {line}
        </text>
      ))}
    </g>
  );
}

function RowLabel({ y, children }) {
  return (
    <text
      x="56"
      y={y}
      fill={colors.secondary}
      fontSize="24"
      fontWeight="700"
      letterSpacing="0.7"
    >
      {children}
    </text>
  );
}

function Connector({ d, label, labelX, labelY, labelWidth }) {
  return (
    <g>
      <path
        d={d}
        fill="none"
        stroke={colors.line}
        strokeWidth="2"
        markerEnd="url(#architecture-arrow)"
      />
      {label ? (
        <>
          <rect
            x={labelX - labelWidth / 2}
            y={labelY - 16}
            width={labelWidth}
            height="32"
            rx="5"
            fill="#FFFFFF"
          />
          <text
            x={labelX}
            y={labelY + 5}
            textAnchor="middle"
            fill={colors.secondary}
            fontSize="23"
          >
            {label}
          </text>
        </>
      ) : null}
    </g>
  );
}

export default function ArchitectureDiagram() {
  return (
    <div className="overflow-x-auto rounded-2xl border border-tint-border bg-white shadow-browser">
      <svg
        aria-labelledby="architecture-title architecture-description"
        className="block h-auto min-w-[700px] w-full font-sans"
        role="img"
        viewBox="0 0 1440 820"
        xmlns="http://www.w3.org/2000/svg"
      >
        <title id="architecture-title">TrueTone system architecture</title>
        <desc id="architecture-description">
          A diagram showing how a skin photo is analyzed by three parallel AI
          models, then used for personalized recommendations, safety checks,
          product scanning, and profile-aware chat.
        </desc>
        <defs>
          <marker
            id="architecture-arrow"
            markerWidth="10"
            markerHeight="10"
            refX="8"
            refY="5"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0 0L10 5L0 10z" fill={colors.line} />
          </marker>
        </defs>

        <RowLabel y="35">YOU UPLOAD</RowLabel>

        <Connector d="M356 107H478" label="HTTPS, JSON" labelX="417" labelY="91" labelWidth="118" />
        <Connector
          d="M802 107H1080"
          label="HTTPS, JSON"
          labelX="941"
          labelY="91"
          labelWidth="118"
        />

        <Box
          x={56}
          y={57}
          width={300}
          height={100}
          title="Browser"
          detail="React, Vite, Tailwind"
          fill={colors.blueFill}
          stroke={colors.blueStroke}
        />
        <Box
          x={478}
          y={57}
          width={324}
          height={100}
          title="Django REST API"
          detail="token auth, Swagger docs"
          fill={colors.greenFill}
          stroke={colors.greenStroke}
        />
        <Box
          x={1080}
          y={57}
          width={300}
          height={100}
          title="PostgreSQL"
          detail="users, scans, history"
          fill={colors.cream}
          stroke={colors.border}
        />

        <RowLabel y="190">AI READS YOUR SKIN</RowLabel>

        <Connector d="M227 283H258" />
        <Connector d="M449 283H480" />
        <path
          d="M689 283H710M710 232V403"
          fill="none"
          stroke={colors.line}
          strokeWidth="2"
        />
        <Connector d="M710 232H735" />
        <Connector d="M710 316H735" />
        <Connector d="M710 400H735" />
        <path
          d="M955 232H980M955 316H980M955 400H980M980 232V400"
          fill="none"
          stroke={colors.line}
          strokeWidth="2"
        />
        <Connector d="M980 316H1000" />

        <Box
          x={56}
          y={236}
          width={171}
          height={94}
          title="1 · Validate"
          detail="format, size, decode"
          fill={colors.cream}
          stroke={colors.border}
        />
        <Box
          x={258}
          y={236}
          width={191}
          height={94}
          title="2 · Face detect"
          detail="MediaPipe, crop"
          fill={colors.cream}
          stroke={colors.border}
        />
        <Box
          x={480}
          y={236}
          width={209}
          height={94}
          title="3 · Preprocess"
          detail="224x224, normalise"
          fill={colors.cream}
          stroke={colors.border}
        />
        <Box
          x={735}
          y={193}
          width={220}
          height={78}
          title="Skin type"
          detail="EfficientNet-B0"
          fill={colors.amberFill}
          stroke={colors.amberStroke}
        />
        <Box
          x={735}
          y={277}
          width={220}
          height={78}
          title="Skin tone"
          detail="EfficientNet-B2"
          fill={colors.amberFill}
          stroke={colors.amberStroke}
        />
        <Box
          x={735}
          y={361}
          width={220}
          height={78}
          title="Skin condition"
          detail={["EfficientNet-B3", "7 outputs"]}
          fill={colors.amberFill}
          stroke={colors.amberStroke}
        />
        <Box
          x={1000}
          y={269}
          width={270}
          height={94}
          title="Grad-CAM + rules"
          detail="heatmaps, thresholds"
          fill={colors.purpleFill}
          stroke={colors.purpleStroke}
        />

        <text
          x="845"
          y="457"
          textAnchor="middle"
          fill={colors.secondary}
          fontSize="23"
          fontStyle="italic"
        >
          three models run in parallel threads
        </text>

        <RowLabel y="493">WE PERSONALISE</RowLabel>

        <Connector
          d="M1135 363V466H205V530"
          label="scan result becomes the skin profile"
          labelX="674"
          labelY="460"
          labelWidth="440"
        />
        <Connector d="M355 589H388" />

        <Box
          x={56}
          y={530}
          width={299}
          height={118}
          title={["Recommendation", "engine"]}
          detail={["rule-based points,", "CSV catalogue"]}
          fill={colors.greenFill}
          stroke={colors.greenStroke}
        />
        <Box
          x={388}
          y={530}
          width={270}
          height={118}
          title="Safety filters"
          detail={["allergy, pregnancy:", "hard block"]}
          fill={colors.greenFill}
          stroke={colors.greenStroke}
        />
        <Box
          x={751}
          y={530}
          width={270}
          height={118}
          title="Product scanner"
          detail={["vision LLM,", "ingredient match"]}
          fill={colors.blueFill}
          stroke={colors.blueStroke}
        />
        <Box
          x={1070}
          y={530}
          width={310}
          height={118}
          title="Chatbot"
          detail={["LLM grounded in", "the profile"]}
          fill={colors.blueFill}
          stroke={colors.blueStroke}
        />

        <RowLabel y="688">YOU GET RESULTS</RowLabel>
        <rect
          x="56"
          y="708"
          width="1324"
          height="94"
          rx="12"
          fill="#F5ECE4"
        />
        <text x="76" y="740" fill={colors.secondary} fontSize="23">
          One request runs the whole image pipeline.
        </text>
        <text x="76" y="766" fill={colors.secondary} fontSize="23">
          The three models run in parallel threads, and the result becomes the user&apos;s skin profile
        </text>
        <text x="76" y="792" fill={colors.secondary} fontSize="23">
          that drives the recommendations, the product scanner and the chatbot.
        </text>
      </svg>
    </div>
  );
}
