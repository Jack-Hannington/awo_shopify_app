// @ts-check

/**
 * @typedef {import("../generated/api").RunInput} RunInput
 * @typedef {import("../generated/api").FunctionRunResult} FunctionRunResult
 */

/**
 * @param {RunInput} input
 * @returns {FunctionRunResult}
 */
export function run(input) {
    const deliverySchedule = input.cart.deliveryScheduleAttribute?.value;
  
    if (deliverySchedule) {
      return {
        operations: [
          {
            // @ts-ignore
            updateMetafield: {
              namespace: "deliveryApp",
              key: "deliverySchedule",
              type: "single_line_text_field",
              value: deliverySchedule
            }
          }
        ]
      };
    }
  
    // If no deliverySchedule, return an empty operations array
    return { operations: [] };
  }