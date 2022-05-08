import { plainToInstance } from 'class-transformer'
import * as zod from 'zod'

import { BadRequestException } from '@nestjs/common'
import { Subscription, SubscriptionOptions as SO } from '@nestjs/graphql'

import { IModelFromZodOptionsWithMapper, modelFromZod } from '../model-from-zod'

export interface SubscriptionOptions<T extends object> extends SO {
  /**
   * Options for model creation from `zod`.
   *
   * @type {IModelFromZodOptionsWithMapper<T>}
   * @memberof QueryOptions
   */
  zod?: IModelFromZodOptionsWithMapper<T>
}

/**
 * Subscription handler (method) Decorator.
 * Routes subscriptions to this method.
 * 
 * Uses a `zod` object.
 *
 * @export
 * @template T The type of the zod object input.
 * @param {T} input The zod input object.
 * @return {MethodDecorator} A {@link MethodDecorator}.
 */
export function SubscriptionWithZod<T extends zod.AnyZodObject>(input: T): MethodDecorator

/**
 * Subscription handler (method) Decorator.
 * Routes subscriptions to this method.
 * 
 * Uses a `zod` object.
 *
 * @export
 * @template T The type of the zod object input.
 * @param {T} input The zod input object.
 * @param {string} name The name of the method.
 * @return {MethodDecorator} A {@link MethodDecorator}.
 */
export function SubscriptionWithZod<T extends zod.AnyZodObject>(input: T, name: string): MethodDecorator

/**
 * Subscription handler (method) Decorator.
 * Routes subscriptions to this method.
 * 
 * Uses a `zod` object.
 *
 * @export
 * @template T The type of the zod object input.
 * @param {T} input The zod input object.
 * @param {SubscriptionOptions<zod.infer<T>>} options The options for 
 * subscription method.
 * 
 * @return {MethodDecorator} A {@link MethodDecorator}.
 */
export function SubscriptionWithZod<T extends zod.AnyZodObject>(input: T, options: SubscriptionOptions<zod.infer<T>>): MethodDecorator

/**
 * Subscription handler (method) Decorator.
 * Routes subscriptions to this method.
 * 
 * Uses a `zod` object.
 *
 * @export
 * @template T The type of the zod object input.
 * @param {T} input The zod input object.
 * @param {string} name The name of the method.
 * @param {SubscriptionOptions<zod.infer<T>>} options The options for 
 * subscription method.
 * 
 * @return {MethodDecorator} A {@link MethodDecorator}.
 */
export function SubscriptionWithZod<T extends zod.AnyZodObject>(input: T, name: string, options: Pick<SubscriptionOptions<zod.infer<T>>, 'filter' | 'resolve' | 'zod'>): MethodDecorator
export function SubscriptionWithZod<T extends zod.AnyZodObject>(input: T, nameOrOptions?: string | SubscriptionOptions<zod.infer<T>>, pickedOptions?: Pick<SubscriptionOptions<zod.infer<T>>, 'filter' | 'resolve' | 'zod'>) {
  let zodOptions: IModelFromZodOptionsWithMapper<T> | undefined

  if (typeof nameOrOptions === 'object') {
    zodOptions = nameOrOptions.zod
  }
  else if (typeof pickedOptions === 'object') {
    zodOptions = pickedOptions.zod
  }

  const model = modelFromZod(input, zodOptions)

  return function _SubscriptionWithZod(target: any, methodName: string, descriptor: PropertyDescriptor) {
    let newDescriptor = descriptor || {}

    const originalFunction = descriptor?.value ?? target[ methodName ]

    newDescriptor.value = function _queryWithZod(...args: any[]) {
      const result = originalFunction.apply(this, args)
      if (result instanceof Promise) {
        return result
          .then(output => input.parseAsync(output))
          .then((output) => plainToInstance(model, output))
          .catch((error: zod.ZodError) => {
            const messages = error.issues.reduce((prev, curr) => {
              prev[ curr.path.join('.') ] = curr.message
              return prev
            }, {} as any)

            return new BadRequestException(messages)
          })
      }
      else {
        const parseResult = input.safeParse(result)
        if (parseResult.success) {
          return plainToInstance(model, parseResult.data)
        }
        else {
          const messages = parseResult.error.issues.reduce((prev, curr) => {
            prev[ curr.path.join('.') ] = curr.message
            return prev
          }, {} as any)

          return new BadRequestException(messages)
        }
      }
    }

    if (!descriptor) {
      Object.defineProperty(target, methodName, newDescriptor)
    }

    if (typeof nameOrOptions === 'string') {
      if (typeof pickedOptions === 'object') {
        Subscription(nameOrOptions, pickedOptions)(target, methodName, descriptor)
      }
      else {
        Subscription(nameOrOptions)(target, methodName, descriptor)
      }
    }
    else if (typeof nameOrOptions === 'object') {
      const { zod, ...rest } = nameOrOptions
      Subscription(() => model, rest)(target, methodName, descriptor)
    }
    else {
      Subscription(() => model)(target, methodName, descriptor)
    }
  }
}
