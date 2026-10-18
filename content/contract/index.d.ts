import type { Handle, RemixNode } from 'remix/component'

type Component<Props> = (handle: Handle<Props>) => () => RemixNode

export interface ImageProps {
  image: string
  alt?: string
  sizes?: string
  priority?: boolean
  title?: string
}
export interface PageProps {
  firstIsHero?: boolean
  children?: RemixNode
}
export interface HeroProps {
  title?: string
  subtitle?: string
  image?: string
  first?: boolean
  pullUp?: boolean
  textColor?: 'light' | 'dark'
}
export interface TextBlockProps {
  title?: string
  portrait?: string
  pullUp?: boolean
  bigOnLg?: boolean
  as?: 'section' | 'div'
  children?: RemixNode
}
export interface ImageBandProps {
  title?: string
  smallTitle?: string
  pullUp?: boolean
  breakPoint?: 'none' | 'sm' | 'md' | 'lg'
  images: { image: string; includeStacked?: boolean; title?: string }[]
}
export interface TwoColumnTextProps {
  headline?: string
  children?: RemixNode
}
export interface ProseProps {
  textSize?: 'small' | 'medium' | 'large' | 'xl'
  bigOnLg?: boolean
  children?: RemixNode
}
export interface IconProps {
  icon: string
  iconLabel?: string
  iconVariant?: 'solid' | 'outline'
  iconSize?: string
}
export interface ButtonProps {
  label: string
  href: string
  blank?: boolean
  icon?: string
  iconLabel?: string
}
export interface IconListProps {
  list: { icon: string; iconLabel?: string; text: string }[]
}
export interface TimetableProps {
  list: { time: string; title?: RemixNode }[]
}
export interface Identity {
  name: string
  link?: string
}
export interface Contributor extends Identity {
  description?: string
  roles: string[]
}
export interface Author extends Identity {
  description?: string
}
export interface SongReference {
  slug: `song/${string}`
}
export interface Track {
  title: string
  addition?: string
  duration?: number
  song?: SongReference
}
export interface ReleaseProps {
  title: string
  subtitle?: string
  artist?: string
  cover?: string
  releaseDate?: string
  hideReleaseDay?: boolean
  genres?: string[]
  languages?: string[]
  tracks: Track[]
  shops?: Record<string, string>
  contributors?: Contributor[]
  children?: RemixNode
}
export interface SongProps {
  title: string
  subtitle?: string
  creationDate?: string
  hideCreationDay?: boolean
  authors?: Author[]
  children?: RemixNode
}
export interface LinkTreeProps {
  portrait: string
  links: { title: string; href: string; description?: string; icon: string }[]
  music: { title: string; href: string; icon: string }[]
  otherLinks: { title: string; href: string; description?: string; icon: string }[]
  children?: RemixNode
}
export declare const Image: Component<ImageProps>
export declare const Page: Component<PageProps>
export declare const Hero: Component<HeroProps>
export declare const TextBlock: Component<TextBlockProps>
export declare const ImageBand: Component<ImageBandProps>
export declare const TwoColumnText: Component<TwoColumnTextProps>
export declare const Prose: Component<ProseProps>
export declare const Button: Component<ButtonProps>
export declare const Icon: Component<IconProps>
export declare const IconList: Component<IconListProps>
export declare const Timetable: Component<TimetableProps>
export declare const Release: Component<ReleaseProps>
export declare const Song: Component<SongProps>
export declare const LinkTree: Component<LinkTreeProps>
