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
  const compact = height < 60;

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
      <text
        x={x + width / 2}
        y={y + (compact ? 20 : 34)}
        textAnchor="middle"
        fill={colors.ink}
        fontSize={compact ? "14" : "18"}
        fontWeight="650"
      >
        {title}
      </text>
      <text
        x={x + width / 2}
        y={y + (compact ? 40 : 59)}
        textAnchor="middle"
        fill={colors.secondary}
        fontSize={compact ? "11" : "14"}
      >
        {detail}
      </text>
    </g>
  );
}

function RowLabel({ y, children }) {
  return (
    <text
      x="56"
      y={y}
      fill={colors.secondary}
      fontSize="15"
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
            height="22"
            rx="5"
            fill="#FFFFFF"
          />
          <text
            x={labelX}
            y={labelY}
            textAnchor="middle"
            fill={colors.secondary}
            fontSize="13"
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
        className="block h-auto min-w-[1100px] w-full font-sans"
        role="img"
        viewBox="0 0 1440 770"
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

        <Connector d="M355 101H478" label="HTTPS, JSON" labelX="416" labelY="87" labelWidth="96" />
        <Connector
          d="M802 101H1080"
          label="HTTPS, JSON"
          labelX="941"
          labelY="87"
          labelWidth="96"
        />

        <Box
          x={56}
          y={57}
          width={300}
          height={88}
          title="Browser"
          detail="React, Vite, Tailwind"
          fill={colors.blueFill}
          stroke={colors.blueStroke}
        />
        <Box
          x={478}
          y={57}
          width={324}
          height={88}
          title="Django REST API"
          detail="token auth, Swagger docs"
          fill={colors.greenFill}
          stroke={colors.greenStroke}
        />
        <Box
          x={1080}
          y={57}
          width={300}
          height={88}
          title="PostgreSQL"
          detail="users, scans, history"
          fill={colors.cream}
          stroke={colors.border}
        />

        <RowLabel y="190">AI READS YOUR SKIN</RowLabel>

        <Connector d="M227 270H258" />
        <Connector d="M449 270H480" />
        <path
          d="M689 270H710M710 230V350"
          fill="none"
          stroke={colors.line}
          strokeWidth="2"
        />
        <Connector d="M710 230H735" />
        <Connector d="M710 290H735" />
        <Connector d="M710 350H735" />
        <path
          d="M930 230H958M930 290H958M930 350H958M958 230V350"
          fill="none"
          stroke={colors.line}
          strokeWidth="2"
        />
        <Connector d="M958 290H1000" />

        <Box
          x={56}
          y={230}
          width={171}
          height={80}
          title="1 · Validate"
          detail="format, size, decode"
          fill={colors.cream}
          stroke={colors.border}
        />
        <Box
          x={258}
          y={230}
          width={191}
          height={80}
          title="2 · Face detect"
          detail="MediaPipe, crop"
          fill={colors.cream}
          stroke={colors.border}
        />
        <Box
          x={480}
          y={230}
          width={209}
          height={80}
          title="3 · Preprocess"
          detail="224x224, normalise"
          fill={colors.cream}
          stroke={colors.border}
        />
        <Box
          x={735}
          y={205}
          width={195}
          height={50}
          title="Skin type"
          detail="EfficientNet-B0"
          fill={colors.amberFill}
          stroke={colors.amberStroke}
        />
        <Box
          x={735}
          y={265}
          width={195}
          height={50}
          title="Skin tone"
          detail="EfficientNet-B2"
          fill={colors.amberFill}
          stroke={colors.amberStroke}
        />
        <Box
          x={735}
          y={325}
          width={195}
          height={50}
          title="Skin condition"
          detail="EfficientNet-B3, 7 outputs"
          fill={colors.amberFill}
          stroke={colors.amberStroke}
        />
        <Box
          x={1000}
          y={245}
          width={250}
          height={90}
          title="Grad-CAM + rules"
          detail="heatmaps, thresholds"
          fill={colors.purpleFill}
          stroke={colors.purpleStroke}
        />

        <text
          x="832"
          y="402"
          textAnchor="middle"
          fill={colors.secondary}
          fontSize="13"
          fontStyle="italic"
        >
          three models run in parallel threads
        </text>

        <RowLabel y="480">WE PERSONALISE</RowLabel>

        <Connector
          d="M1125 335V452H209V512"
          label="scan result becomes the skin profile"
          labelX="674"
          labelY="445"
          labelWidth="252"
        />
        <Connector d="M355 562H388" />

        <Box
          x={56}
          y={512}
          width={299}
          height={100}
          title="Recommendation engine"
          detail="rule-based points, CSV catalogue"
          fill={colors.greenFill}
          stroke={colors.greenStroke}
        />
        <Box
          x={388}
          y={512}
          width={270}
          height={100}
          title="Safety filters"
          detail="allergy, pregnancy: hard block"
          fill={colors.greenFill}
          stroke={colors.greenStroke}
        />
        <Box
          x={751}
          y={512}
          width={270}
          height={100}
          title="Product scanner"
          detail="vision LLM, ingredient match"
          fill={colors.blueFill}
          stroke={colors.blueStroke}
        />
        <Box
          x={1070}
          y={512}
          width={310}
          height={100}
          title="Chatbot"
          detail="LLM grounded in the profile"
          fill={colors.blueFill}
          stroke={colors.blueStroke}
        />

        <RowLabel y="660">YOU GET RESULTS</RowLabel>
        <rect
          x="56"
          y="678"
          width="1324"
          height="66"
          rx="12"
          fill="#F5ECE4"
        />
        <text x="76" y="706" fill={colors.secondary} fontSize="14">
          One request runs the whole image pipeline. The three models run in parallel threads, and the result becomes the user&apos;s skin profile
        </text>
        <text x="76" y="728" fill={colors.secondary} fontSize="14">
          that drives the recommendations, the product scanner and the chatbot.
        </text>
      </svg>
    </div>
  );
}
