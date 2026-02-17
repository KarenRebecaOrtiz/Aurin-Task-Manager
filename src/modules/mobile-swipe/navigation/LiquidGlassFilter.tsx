'use client'

import { useEffect, useRef } from 'react'

// ============================================================
// Liquid Glass SVG Filter
// Faithfully follows: https://kube.io/blog/liquid-glass-css-svg/
//
// Pipeline:
//   1. Convex squircle surface → Snell's Law refraction
//   2. Pre-compute 127 samples, normalize by max displacement
//   3. Pill-shaped displacement map (distance from nearest edge)
//   4. Specular rim light (angle-based, Fresnel boost at edges)
//   5. SVG filter: feImage → feDisplacementMap (scale = maxDisplacement)
//   6. Overlay specular via feBlend screen
// ============================================================

export const LIQUID_GLASS_FILTER_ID = 'liquidGlassFilter'

// --- Surface profiles (kube.io §Surface Functions) ---

/** Convex squircle — Apple's preferred: y = (1 - (1-x)^4)^(1/4) */
function convexSquircle(x: number): number {
  const t = Math.max(0, Math.min(1, x))
  return Math.pow(1 - Math.pow(1 - t, 4), 0.25)
}

/** Central difference derivative: approximates surface normal */
function deriv(fn: (x: number) => number, x: number, h = 0.001): number {
  return (fn(x + h) - fn(x - h)) / (2 * h)
}

// --- Pre-compute displacement samples (kube.io §Displacement Vector) ---

const NUM_SAMPLES = 127

interface Sample {
  angle: number     // direction of displacement (radial)
  magnitude: number // normalized displacement magnitude
}

function precomputeSamples(refractionLevel: number): {
  samples: Sample[]
  maxDisplacement: number
} {
  const raw: number[] = []

  for (let i = 0; i < NUM_SAMPLES; i++) {
    // distance from border: 0 = edge, 1 = center
    const dist = i / (NUM_SAMPLES - 1)

    const surfaceSlope = deriv(convexSquircle, dist)
    const normalAngle = Math.atan(surfaceSlope)

    // Snell's Law: n_air * sin(θ₁) = n_glass * sin(θ₂)
    // n_air = 1, n_glass = 1.5
    const sinRefracted = Math.sin(normalAngle) / 1.5
    const clampedSin = Math.max(-1, Math.min(1, sinRefracted))
    const refractionAngle = Math.asin(clampedSin)

    // Displacement magnitude (pixels)
    const displacement = Math.tan(normalAngle - refractionAngle) * refractionLevel
    raw.push(displacement)
  }

  // Normalize by maximum (kube.io: "reuse that maximum directly as scale")
  const maxDisplacement = Math.max(...raw.map(Math.abs), 0.001)

  const samples: Sample[] = raw.map((mag, i) => ({
    angle: 0, // will be set per-pixel based on direction from edge
    magnitude: mag / maxDisplacement,
  }))

  return { samples, maxDisplacement }
}

// --- Distance from nearest edge for pill/rounded-rect shape ---

function pillEdgeDistance(
  px: number, py: number,
  w: number, h: number,
  radius: number
): number {
  // Distance from nearest edge, accounting for rounded corners
  const r = Math.min(radius, w / 2, h / 2)

  // Distance from each straight edge
  const dLeft = px
  const dRight = w - px
  const dTop = py
  const dBottom = h - py

  // For corners, calculate distance from the corner circle
  let minDist = Math.min(dLeft, dRight, dTop, dBottom)

  // Check if we're in a corner region
  const inLeftCorner = px < r
  const inRightCorner = px > w - r
  const inTopCorner = py < r
  const inBottomCorner = py > h - r

  if ((inLeftCorner || inRightCorner) && (inTopCorner || inBottomCorner)) {
    const cx = inLeftCorner ? r : w - r
    const cy = inTopCorner ? r : h - r
    const cornerDist = Math.sqrt((px - cx) ** 2 + (py - cy) ** 2)
    const distFromEdge = r - cornerDist
    if (distFromEdge < 0) return -1 // outside rounded corner
    minDist = Math.min(minDist, distFromEdge)
  }

  return minDist
}

/** Direction vector pointing inward from nearest edge */
function edgeNormal(
  px: number, py: number,
  w: number, h: number,
  radius: number
): { nx: number; ny: number } {
  const r = Math.min(radius, w / 2, h / 2)

  const dLeft = px
  const dRight = w - px
  const dTop = py
  const dBottom = h - py

  // Check corner regions
  const inLeftCorner = px < r
  const inRightCorner = px > w - r
  const inTopCorner = py < r
  const inBottomCorner = py > h - r

  if ((inLeftCorner || inRightCorner) && (inTopCorner || inBottomCorner)) {
    const cx = inLeftCorner ? r : w - r
    const cy = inTopCorner ? r : h - r
    const dx = px - cx
    const dy = py - cy
    const len = Math.sqrt(dx * dx + dy * dy) || 1
    // Point inward (toward center from corner edge)
    return { nx: -dx / len, ny: -dy / len }
  }

  // Straight edges — normal points inward
  const min = Math.min(dLeft, dRight, dTop, dBottom)
  if (min === dLeft) return { nx: 1, ny: 0 }
  if (min === dRight) return { nx: -1, ny: 0 }
  if (min === dTop) return { nx: 0, ny: 1 }
  return { nx: 0, ny: -1 }
}

// --- Generate maps ---

function generateMaps(
  w: number,
  h: number,
  borderRadius: number,
  refractionLevel: number,
  specularAngleDeg: number,
  specularOpacity: number,
  specularSaturation: number,
): { displacement: string; specular: string; maxDisplacement: number } {
  const { samples, maxDisplacement } = precomputeSamples(refractionLevel)

  // Displacement map canvas
  const dCanvas = document.createElement('canvas')
  dCanvas.width = w
  dCanvas.height = h
  const dCtx = dCanvas.getContext('2d')!
  const dImg = dCtx.createImageData(w, h)
  const d = dImg.data

  // Specular map canvas
  const sCanvas = document.createElement('canvas')
  sCanvas.width = w
  sCanvas.height = h
  const sCtx = sCanvas.getContext('2d')!
  const sImg = sCtx.createImageData(w, h)
  const s = sImg.data

  // Light direction for specular (kube.io: configurable angle)
  const specRad = (specularAngleDeg * Math.PI) / 180
  const lightX = Math.cos(specRad)
  const lightY = Math.sin(specRad)

  // Maximum possible edge distance (for normalization)
  const maxEdgeDist = Math.min(w, h) / 2

  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const idx = (py * w + px) * 4

      const edgeDist = pillEdgeDistance(px, py, w, h, borderRadius)

      if (edgeDist < 0) {
        // Outside the pill shape
        d[idx] = 128; d[idx + 1] = 128; d[idx + 2] = 128; d[idx + 3] = 255
        s[idx] = 0; s[idx + 1] = 0; s[idx + 2] = 0; s[idx + 3] = 0
        continue
      }

      // Normalize distance: 0 = edge, 1 = deep interior
      const normalizedDist = Math.min(1, edgeDist / maxEdgeDist)

      // Look up pre-computed sample
      const sampleIdx = Math.min(
        NUM_SAMPLES - 1,
        Math.round(normalizedDist * (NUM_SAMPLES - 1))
      )
      const magnitude = samples[sampleIdx].magnitude

      // Direction: displacement points inward from nearest edge
      const { nx, ny } = edgeNormal(px, py, w, h, borderRadius)

      // Polar → Cartesian displacement (kube.io encoding)
      // R = 128 + x * 127, G = 128 + y * 127
      const dispX = nx * magnitude
      const dispY = ny * magnitude

      d[idx] = Math.round(Math.max(0, Math.min(255, 128 + dispX * 127)))
      d[idx + 1] = Math.round(Math.max(0, Math.min(255, 128 + dispY * 127)))
      d[idx + 2] = 128
      d[idx + 3] = 255

      // --- Specular highlight (kube.io §Specular) ---
      // Intensity = dot(surface_normal, light_direction)
      // Rim boost via Fresnel approximation at edges
      const surfaceSlope = deriv(convexSquircle, normalizedDist)
      const sNx = -surfaceSlope * nx
      const sNy = -surfaceSlope * ny
      const sLen = Math.sqrt(sNx * sNx + sNy * sNy + 1)
      const dot = Math.max(0, (sNx * lightX + sNy * lightY) / sLen)

      // Fresnel: brighter at grazing angles (edges)
      const fresnel = Math.pow(1 - convexSquircle(normalizedDist), 2.5)
      const specIntensity = (Math.pow(dot, 20) * 0.8 + fresnel * 0.4) * specularOpacity

      const specVal = Math.round(Math.min(255, specIntensity * 255 * specularSaturation))
      s[idx] = specVal
      s[idx + 1] = specVal
      s[idx + 2] = specVal
      s[idx + 3] = Math.round(Math.min(255, specIntensity * 255))
    }
  }

  dCtx.putImageData(dImg, 0, 0)
  sCtx.putImageData(sImg, 0, 0)

  return {
    displacement: dCanvas.toDataURL(),
    specular: sCanvas.toDataURL(),
    maxDisplacement,
  }
}

// --- React Component ---

interface LiquidGlassFilterProps {
  width?: number
  height?: number
  borderRadius?: number
  /** Refraction level — maps to kube.io "Refraction Level" slider (0–1) */
  refractionLevel?: number
  /** Specular light angle in degrees (kube.io default: -60°) */
  specularAngle?: number
  /** Specular opacity (kube.io range: 0.2–0.5) */
  specularOpacity?: number
  /** Specular saturation (kube.io range: 4–9) */
  specularSaturation?: number
  /** Blur level for glass diffusion (kube.io: 1.0) */
  blurLevel?: number
}

export function LiquidGlassFilter({
  width = 400,
  height = 56,
  borderRadius = 28,
  refractionLevel = 0.7,
  specularAngle = -60,
  specularOpacity = 0.3,
  specularSaturation = 6,
  blurLevel = 1.0,
}: LiquidGlassFilterProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const scaleRef = useRef(20)

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return

    const { displacement, specular, maxDisplacement } = generateMaps(
      width, height, borderRadius,
      refractionLevel, specularAngle, specularOpacity, specularSaturation
    )

    scaleRef.current = maxDisplacement

    // Set feImage hrefs dynamically (avoids SSR hydration issues)
    const images = svg.querySelectorAll('feImage')
    if (images[0]) images[0].setAttribute('href', displacement)
    if (images[1]) images[1].setAttribute('href', specular)

    // Set scale to maxDisplacement (kube.io: "reuse maximum directly as scale")
    const dispMap = svg.querySelector('feDisplacementMap')
    if (dispMap) dispMap.setAttribute('scale', String(Math.round(maxDisplacement)))
  }, [width, height, borderRadius, refractionLevel, specularAngle, specularOpacity, specularSaturation])

  return (
    <svg
      ref={svgRef}
      style={{ display: 'none' }}
      aria-hidden="true"
      colorInterpolationFilters="sRGB"
    >
      <defs>
        <filter id={LIQUID_GLASS_FILTER_ID}>
          {/* 1. Blur source — glass diffusion (kube.io: "Blur Level") */}
          <feGaussianBlur
            in="SourceGraphic"
            stdDeviation={blurLevel}
            result="blurred_source"
          />

          {/* 2. Load displacement map (href set via useEffect) */}
          <feImage
            x="0" y="0"
            width={width} height={height}
            result="displacement_map"
          />

          {/* 3. Apply refraction displacement (scale set via useEffect) */}
          <feDisplacementMap
            in="blurred_source"
            in2="displacement_map"
            scale={20}
            xChannelSelector="R"
            yChannelSelector="G"
            result="displaced"
          />

          {/* 4. Load specular highlight (href set via useEffect) */}
          <feImage
            x="0" y="0"
            width={width} height={height}
            result="specular_layer"
          />
          <feGaussianBlur
            in="specular_layer"
            stdDeviation="1.5"
            result="specular_blurred"
          />

          {/* 5. Blend specular over displaced content */}
          <feBlend
            in="specular_blurred"
            in2="displaced"
            mode="screen"
          />
        </filter>
      </defs>
    </svg>
  )
}
