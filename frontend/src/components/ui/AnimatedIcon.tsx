import type { IconProps } from '@phosphor-icons/react';
import type { ElementType } from 'react';

type IconAnimation = 'none' | 'hover' | 'wiggle' | 'pulse' | 'active' | 'spin';

interface AnimatedIconProps extends Omit<IconProps, 'children'> {
    icon: ElementType;
    animation?: IconAnimation;
    className?: string;
}

const animationClassMap: Record<IconAnimation, string> = {
    none: '',
    hover: 'icon-animate-hover',
    wiggle: 'icon-animate-wiggle',
    pulse: 'icon-animate-pulse',
    active: 'icon-animate-active',
    spin: 'icon-animate-spin',
};

export function AnimatedIcon({
    icon: Icon,
    animation = 'none',
    className = '',
    ...iconProps
}: AnimatedIconProps) {
    const animationClass = animationClassMap[animation];
    const classes = [animationClass, className].filter(Boolean).join(' ');

    return <Icon {...iconProps} className={classes} />;
}
