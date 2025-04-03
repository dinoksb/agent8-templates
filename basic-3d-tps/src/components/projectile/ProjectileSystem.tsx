import React, { createContext, useState, useEffect, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { Vector3 } from "three";
import { FireballProjectile } from "./FireballProjectile";
import { ProjectileType } from "../../types/projectile";

// 간소화된 투사체 데이터 구조
interface ProjectileInfo {
  id: string;
  type: ProjectileType;
  position: Vector3;
  direction: Vector3;
  createdAt: number;
  options?: Record<string, unknown>;
}

// 간소화된 발사 옵션 구조
interface LaunchOptions {
  position: Vector3;
  direction: Vector3;
  type?: ProjectileType;
  options?: Record<string, unknown>;
}

// 프로젝타일 시스템 컨텍스트 인터페이스
interface ProjectileSystemContextType {
  fireProjectile: (options: LaunchOptions) => string;
  removeProjectile: (id: string) => void;
  projectiles: ProjectileInfo[];
}

// 기본 컨텍스트 값
const defaultContext: ProjectileSystemContextType = {
  fireProjectile: () => "",
  removeProjectile: () => {},
  projectiles: [],
};

// 컨텍스트 생성
export const ProjectileSystemContext =
  createContext<ProjectileSystemContextType>(defaultContext);

// 프로젝타일 시스템 컴포넌트 속성
interface ProjectileSystemProps {
  children: React.ReactNode;
  projectileLifetime?: number;
  cleanupInterval?: number;
}

/**
 * 투사체 시스템 컴포넌트
 *
 * 투사체 생성, 관리, 렌더링을 담당하는 시스템입니다.
 */
export const ProjectileSystem: React.FC<ProjectileSystemProps> = ({
  children,
  projectileLifetime = 5000, // 기본 투사체 수명 (ms) - 개별 투사체에 lifetime이 지정되지 않았을 때만 사용
  cleanupInterval = 1000, // 정리 간격 (ms)
}) => {
  // 활성 투사체 상태 관리
  const [projectiles, setProjectiles] = useState<ProjectileInfo[]>([]);

  // 투사체 발사 함수
  const fireProjectile = useCallback((options: LaunchOptions): string => {
    const id = uuidv4();
    const now = Date.now();
    const type = options.type || ProjectileType.FIREBALL; // 기본 타입: 파이어볼

    // 새로운 투사체 생성
    const newProjectile: ProjectileInfo = {
      id,
      type,
      position: options.position,
      direction: options.direction,
      createdAt: now,
      options: options.options,
    };

    // 투사체 목록에 추가
    setProjectiles((prev) => [...prev, newProjectile]);
    return id;
  }, []);

  // 투사체 제거 함수
  const removeProjectile = useCallback((id: string) => {
    setProjectiles((prev) => prev.filter((p) => p.id !== id));
  }, []);

  // 수명이 다한 투사체 정리 (백업용 - 각 투사체가 자체적으로 수명을 관리함)
  useEffect(() => {
    const intervalId = setInterval(() => {
      const now = Date.now();
      setProjectiles((prev) =>
        prev.filter((p) => {
          // 최대 수명을 초과한 투사체만 제거 (개별 투사체의 수명 설정이 우선)
          const maxLifetime = Math.max(projectileLifetime, 10000); // 10초를 최대값으로 설정
          return now - p.createdAt < maxLifetime;
        })
      );
    }, cleanupInterval);

    return () => clearInterval(intervalId);
  }, [projectileLifetime, cleanupInterval]);

  // 투사체 렌더링 함수
  const renderProjectile = (projectile: ProjectileInfo) => {
    const commonProps = {
      id: projectile.id,
      position: projectile.position,
      direction: projectile.direction,
      onLifetimeEnd: removeProjectile,
    };

    // 모든 투사체 타입을 파이어볼로 처리
    return (
      <FireballProjectile
        key={projectile.id}
        {...commonProps}
        {...(projectile.options as object)}
      />
    );
  };

  // 컨텍스트 값
  const contextValue: ProjectileSystemContextType = {
    fireProjectile,
    removeProjectile,
    projectiles,
  };

  return (
    <ProjectileSystemContext.Provider value={contextValue}>
      {children}
      {/* 모든 활성 투사체 렌더링 */}
      {projectiles.map(renderProjectile)}
    </ProjectileSystemContext.Provider>
  );
};
