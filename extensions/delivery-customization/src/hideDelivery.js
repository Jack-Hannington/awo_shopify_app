// @ts-check
//gid://shopify/DeliveryCustomization/13303878
/**
* @typedef {import("../generated/api").RunInput} RunInput
* @typedef {import("../generated/api").FunctionRunResult} FunctionRunResult
* @typedef {import("../generated/api").Operation} Operation
*/

/**
* @param {RunInput} input
* @returns {FunctionRunResult}
*/
export function hideRun(input) {
    const configuration = {
      zipPrefixes: ["M17", "M18", "M19", "CW11"], // Add more prefixes as needed
      titles: ["Local choice of date", "National choice of date"] // Add more titles as needed
    };
  
    let toHide = input.cart.deliveryGroups
      .filter(group => {
        const zip = group.deliveryAddress?.zip ?? "";
        return configuration.zipPrefixes.some(prefix => zip.startsWith(prefix));
      })
      .flatMap(group => group.deliveryOptions ?? [])
      .filter(option => configuration.titles.includes(option.title ?? ""))
      .map(option => /** @type {Operation} */({
        hide: {
          deliveryOptionHandle: option.handle
        }
      }));
  
    return {
      operations: toHide
    };
  }