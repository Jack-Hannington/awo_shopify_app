// @ts-check
//gid://shopify/DeliveryCustomization/13303878

// 7861824f-c424-464a-9a3b-a56a472254dd
// prod: "gid://shopify/DeliveryCustomization/48726305" 
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
      zipPrefixes: ["CW11"], // Add more prefixes as needed
      titles: ["Local choice of date", "Local 2 man delivery"] // Add more titles as needed
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