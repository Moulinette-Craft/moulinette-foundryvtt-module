import { QUICK_SEARCH_MODAL_OUTER_SUBSCRIBERS } from '../../../../ts/constants'

export type OuterSubscriberDataType = {
  id: string
  targetEvent: string
  preventDefaultAction?: boolean
  removeEventListener?: () => void
}

// @ts-expect-error: Symbol-based global window property
window[Symbol.for(QUICK_SEARCH_MODAL_OUTER_SUBSCRIBERS)] = new Map()
export const outerSubscribers: Map<string, OuterSubscriberDataType> =
  // @ts-expect-error: Symbol-based global window property
  window[Symbol.for(QUICK_SEARCH_MODAL_OUTER_SUBSCRIBERS)]

export const shouldDefaultActionBePrevented = (eventName: OuterSubscriberDataType['targetEvent']) =>
  getOuterSubscribersOfEvent(eventName).some((subscriber) => subscriber.preventDefaultAction)

export const getOuterSubscribersOfEvent = (eventName: OuterSubscriberDataType['targetEvent']) =>
  Array.from(outerSubscribers.values()).filter((subscriber) => subscriber.targetEvent === eventName)

export const addOuterSubscriber = <ExpectedPayloadType>(
  data: OuterSubscriberDataType,
  options?: { runOnce?: boolean; callback?: (eventPayload: ExpectedPayloadType) => unknown },
) =>
  new Promise<CustomEventInit<ExpectedPayloadType>>((resolve) => {
    const eventHandler = (payload: CustomEventInit<ExpectedPayloadType>) => {
      resolve(payload)
      if (options?.callback) {
        options?.callback(payload.detail!)
      }

      if (options?.runOnce) {
        window.removeEventListener(data.targetEvent, eventHandler)
      }
    }

    window.addEventListener(data.targetEvent, eventHandler)
    outerSubscribers.set(data.id, {
      ...data,
      removeEventListener: () => window.removeEventListener(data.targetEvent, eventHandler),
    })
  })

export const removeOuterSubscriber = (
  data: OuterSubscriberDataType | OuterSubscriberDataType['id'],
) => {
  const id = typeof data === 'string' ? data : data.id
  const subscriber = outerSubscribers.get(id)
  if (subscriber?.removeEventListener) {
    subscriber.removeEventListener()
  }

  outerSubscribers.delete(id)
}
