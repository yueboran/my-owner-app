import React, { useRef, useState, useCallback } from 'react';

export interface CometCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 子元素内容 */
  children: React.ReactNode;
  /** 外层容器自定义样式类 */
  containerClassName?: string;
  /** 卡片内部容器样式类 */
  className?: string;
  /** 3D 旋转最大角度（度数，默认 14） */
  rotateDepth?: number;
  /** 鼠标悬停时的放大倍率（默认 1.02） */
  hoverScale?: number;
  /** 是否启用彗星光斑高光跟随（默认 true） */
  enableGlare?: boolean;
}

/**
 * 彗星卡（CometCard）组件
 * 提供平滑的 3D 倾斜透视悬浮与物理光斑反射效果
 */
export function CometCard({
  children,
  containerClassName = '',
  className = '',
  rotateDepth = 12,
  hoverScale = 1.02,
  enableGlare = true,
  style,
  ...props
}: CometCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const [glarePos, setGlarePos] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);

  // 鼠标在卡片上方移动时计算三维旋转角度与彗星反光坐标
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;

      // 归一化坐标 (-1 到 1)
      const xPercent = (clientX / rect.width) * 2 - 1;
      const yPercent = (clientY / rect.height) * 2 - 1;

      // 计算 3D 倾斜角度：Y 轴偏移影响 X 轴旋转，X 轴偏移影响 Y 轴旋转
      const rotX = -yPercent * rotateDepth;
      const rotY = xPercent * rotateDepth;

      setRotate({ x: rotX, y: rotY });
      setGlarePos({
        x: (clientX / rect.width) * 100,
        y: (clientY / rect.height) * 100,
      });
    },
    [rotateDepth]
  );

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  // 鼠标移出时平滑归位
  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setRotate({ x: 0, y: 0 });
    setGlarePos({ x: 50, y: 50 });
  }, []);

  return (
    <div
      className={`comet-card-wrapper relative ${containerClassName}`}
      style={{
        perspective: '1000px',
      }}
    >
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`comet-card-inner relative overflow-hidden rounded-[16px] transition-transform ${className}`}
        style={{
          transformStyle: 'preserve-3d',
          transform: isHovered
            ? `rotateX(${rotate.x}deg) rotateY(${rotate.y}deg) scale3d(${hoverScale}, ${hoverScale}, ${hoverScale})`
            : 'rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
          transition: isHovered
            ? 'transform 0.1s ease-out'
            : 'transform 0.5s cubic-bezier(0.23, 1, 0.32, 1)',
          ...style,
        }}
        {...props}
      >
        {/* 子元素内容层 */}
        {children}

        {/* 彗星动态反射高光层 */}
        {enableGlare && (
          <div
            className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-300"
            style={{
              opacity: isHovered ? 1 : 0,
              background: `radial-gradient(circle 280px at ${glarePos.x}% ${glarePos.y}%, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.04) 40%, transparent 75%)`,
              zIndex: 10,
            }}
          />
        )}

        {/* 边缘微光描边发光层 */}
        <div
          className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-300"
          style={{
            opacity: isHovered ? 0.7 : 0.25,
            border: '1px solid rgba(255, 255, 255, 0.16)',
            boxShadow: isHovered
              ? '0 0 24px rgba(99, 102, 241, 0.18), inset 0 1px 1px rgba(255, 255, 255, 0.25)'
              : 'none',
            zIndex: 11,
          }}
        />
      </div>
    </div>
  );
}

export default CometCard;
