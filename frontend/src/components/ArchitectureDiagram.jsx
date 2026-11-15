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
  const titleLines = Array.isArray(title) ? title : [title];
  const detailLines = Array.isArray(detail) ? detail : [detail];
  const titleLineHeight = 30;
  const detailLineHeight = 27;
  const titleDetailGap = 8;
  const contentHeight =
    titleLines.length * titleLineHeight +
    titleDetailGap +
    detailLines.length * detailLineHeight;
  const contentTop = y + (height - contentHeight) / 2;
  const titleY = contentTop + 22;
  const detailY =
    contentTop + titleLines.length * titleLineHeight + titleDetailGap + 17;

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
          y={titleY + index * titleLineHeight}
          textAnchor="middle"
          fill={colors.ink}
          fontSize="28"
          fontWeight="650"
        >
          {line}
        </text>
      ))}
      {detailLines.map((line, index) => (
        <text
          key={`detail-${line}`}
          x={x + width / 2}
          y={detailY + index * detailLineHeight}
          textAnchor="middle"
          fill={colors.secondary}
          fontSize="21"
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
    <div className="rounded-2xl border border-tint-border bg-white p-5 shadow-browser">
      <svg
        aria-labelledby="architecture-title architecture-description"
        className="block h-auto w-full font-sans"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        viewBox="0 0 1440 1220"
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

        <RowLabel y="42">YOU UPLOAD</RowLabel>

        <Connector d="M376 123H502" label="HTTPS, JSON" labelX="439" labelY="97" labelWidth="118" />
        <Connector
          d="M862 123H1064"
          label="HTTPS, JSON"
          labelX="963"
          labelY="97"
          labelWidth="118"
        />

        <Box
          x={56}
          y={70}
          width={320}
          height={106}
          title="Browser"
          detail="React, Vite, Tailwind"
          fill={colors.blueFill}
          stroke={colors.blueStroke}
        />
        <Box
          x={502}
          y={70}
          width={360}
          height={106}
          title="Django REST API"
          detail="token auth, Swagger docs"
          fill={colors.greenFill}
          stroke={colors.greenStroke}
        />
        <Box
          x={1064}
          y={70}
          width={320}
          height={106}
          title="PostgreSQL"
          detail="users, scans, history"
          fill={colors.cream}
          stroke={colors.border}
        />

        <RowLabel y="238">AI READS YOUR SKIN</RowLabel>

        <Connector d="M250 466H286" />
        <Connector d="M506 466H542" />
        <Connector d="M760 466H778" />
        <path
          d="M778 330V602"
          fill="none"
          stroke={colors.line}
          strokeWidth="2"
        />
        <Connector d="M778 330H790" />
        <Connector d="M778 466H790" />
        <Connector d="M778 602H790" />
        <path
          d="M1010 330H1028M1010 466H1028M1010 602H1028M1028 330V602"
          fill="none"
          stroke={colors.line}
          strokeWidth="2"
        />
        <Connector d="M1028 466H1045" />

        <Box
          x={56}
          y={400}
          width={194}
          height={132}
          title="1 · Validate"
          // detail="format, size, decode"
          detail={["format, size,", "decode"]}
          fill={colors.cream}
          stroke={colors.border}
        />
        <Box
          x={286}
          y={400}
          width={220}
          height={132}
          title="2 · Face detect"
          detail="MediaPipe, crop"
          fill={colors.cream}
          stroke={colors.border}
        />
        <Box
          x={542}
          y={400}
          width={218}
          height={132}
          title="3 · Preprocess"
          detail={["224x224,", "normalise"]}
          fill={colors.cream}
          stroke={colors.border}
        />
        <Box
          x={790}
          y={270}
          width={220}
          height={120}
          title="Skin type"
          detail="EfficientNet-B0"
          fill={colors.amberFill}
          stroke={colors.amberStroke}
        />
        <Box
          x={790}
          y={406}
          width={220}
          height={120}
          title="Skin tone"
          detail="EfficientNet-B2"
          fill={colors.amberFill}
          stroke={colors.amberStroke}
        />
        <Box
          x={790}
          y={542}
          width={220}
          height={120}
          title="Skin condition"
          detail={["EfficientNet-B3", "7 outputs"]}
          fill={colors.amberFill}
          stroke={colors.amberStroke}
        />
        <Box
          x={1045}
          y={411}
          width={339}
          height={110}
          title="Grad-CAM + rules"
          detail="heatmaps, thresholds"
          fill={colors.purpleFill}
          stroke={colors.purpleStroke}
        />

        <text
          x="900"
          y="706"
          textAnchor="middle"
          fill={colors.secondary}
          fontSize="23"
          fontStyle="italic"
        >
          three models run in parallel threads
        </text>

        <RowLabel y="805">WE PERSONALISE</RowLabel>

        <Connector
          d="M1214 521V748H340V840"
          label="scan result becomes the skin profile"
          labelX="670"
          labelY="748"
          labelWidth="440"
        />
        <Connector d="M366 911H398" />
        <Connector d="M668 911H700" />
        <Connector d="M1000 911H1032" />

        <Box
          x={56}
          y={840}
          width={310}
          height={142}
          title={["Recommendation", "engine"]}
          detail={["rule-based points,", "CSV catalogue"]}
          fill={colors.greenFill}
          stroke={colors.greenStroke}
        />
        <Box
          x={398}
          y={840}
          width={270}
          height={142}
          title="Safety filters"
          detail={["allergy, pregnancy:", "hard block"]}
          fill={colors.greenFill}
          stroke={colors.greenStroke}
        />
        <Box
          x={700}
          y={840}
          width={300}
          height={142}
          title="Product scanner"
          detail={["vision LLM,", "ingredient match"]}
          fill={colors.blueFill}
          stroke={colors.blueStroke}
        />
        <Box
          x={1032}
          y={840}
          width={352}
          height={142}
          title="Chatbot"
          detail={["LLM grounded in", "the profile"]}
          fill={colors.blueFill}
          stroke={colors.blueStroke}
        />

        <RowLabel y="1045">YOU GET RESULTS</RowLabel>
        <rect
          x="56"
          y="1072"
          width="1328"
          height="120"
          rx="12"
          fill="#F5ECE4"
        />
        <text x="76" y="1105" fill={colors.secondary} fontSize="23">
          One request runs the whole image pipeline.
        </text>
        <text x="76" y="1139" fill={colors.secondary} fontSize="23">
          The three models run in parallel threads, and the result becomes the user&apos;s skin profile
        </text>
        <text x="76" y="1173" fill={colors.secondary} fontSize="23">
          that drives the recommendations, the product scanner and the chatbot.
        </text>
      </svg>
    </div>
  );
}
