import { VisualElement } from "../../render/VisualElement"
import { MotionProps } from "../types"
import { useConstant } from "../../utils/use-constant"
import { isMotionValue } from "../../value/utils/is-motion-value"
import { motionValue, MotionValue } from "../../value"
import {
    isTransformProp,
    isTransformOriginProp,
} from "../../render/dom/utils/transform"

interface PreviousValues {
    [key: string]: number | string | MotionValue
}

interface MotionValueSource {
    [key: string]: MotionValue | unknown
}

/**
 * Scrape props for MotionValues and add/remove them to this component's
 * VisualElement
 */
export function useMotionValues<P>(
    visualElement: VisualElement<any>,
    props: P & MotionProps
): void {
    const prev = useConstant(empty)

    /**
     * Remove MotionValues that are no longer present
     */
    for (const key in prev) {
        const propIsValue = isMotionValue(props[key])
        const styleIsValue = props.style && isMotionValue(props.style[key])

        if (!propIsValue && !styleIsValue) {
            visualElement.removeValue(key)
            delete prev[key]
        }
    }

    /**
     * Add incoming MotionValues
     */
    addMotionValues(visualElement, prev, props as any)
    if (props.style) addMotionValues(visualElement, prev, props.style, true)
}

/**
 * Add incoming MotionValues
 */
function addMotionValues(
    visualElement: VisualElement<any>,
    prev: PreviousValues,
    source: MotionValueSource,
    isStyle: boolean = false
) {
    if (isStyle) visualElement.staticStyle = {}

    for (const key in source) {
        const value = source[key]
        let foundMotionValue = false

        if (isMotionValue(value)) {
            // If this is a MotionValue, add it if it isn't a reserved key
            if (!reservedNames.has(key)) {
                visualElement.addValue(key, value)
                foundMotionValue = true
            }
        } else if (isTransformProp(key) || isTransformOriginProp(key)) {
            // If this is a transform prop, always create a MotionValue
            // to ensure we can reconcile them all together.
            if (!visualElement.hasValue(key)) {
                visualElement.addValue(key, motionValue(value))
            } else if (value !== prev[key]) {
                // If the MotionValue already exists, update it with the
                // latest incoming value
                const motion = visualElement.getValue(key)
                motion!.set(value)
            }
            foundMotionValue = true
        } else if (isStyle) {
            visualElement.staticStyle[key] = value
        }

        if (foundMotionValue) prev[key] = value
    }
}

/**
 * These are props we accept as MotionValues but don't want to add
 * to the VisualElement
 */
const reservedNames = new Set([
    "dragOriginX",
    "dragOriginY",
    "_dragValueX",
    "_dragValueY",
])

const empty = (): PreviousValues => ({})
