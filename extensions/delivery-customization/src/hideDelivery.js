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
// export function hideRun(input) {
//     const configuration = {
//       zipPrefixes: ["CW11"], // Add more prefixes as needed
//       titles: ["Local choice of date", "Local 2 man delivery"] // Add more titles as needed
//     };
  
//     let toHide = input.cart.deliveryGroups
//       .filter(group => {
//         const zip = group.deliveryAddress?.zip ?? "";
//         return configuration.zipPrefixes.some(prefix => zip.startsWith(prefix));
//       })
//       .flatMap(group => group.deliveryOptions ?? [])
//       .filter(option => configuration.titles.includes(option.title ?? ""))
//       .map(option => /** @type {Operation} */({
//         hide: {
//           deliveryOptionHandle: option.handle
//         }
//       }));
  
//     return {
//       operations: toHide
//     };
//   }


// @ts-check


// @ts-check


const configuration = {
    remoteDeliveryPostcodes: ["IV", "HS", "KA27", "KA28", "KW", "PA20", "PA21", "PA22", "PA23", "PA24", "PA25", "PA26", "PA27", "PA28", "PA29", "PA30", "PA31", "PA32", "PA33", "PA34", "PA35", "PA36", "PA37", "PA38", "PA39", "PA40", "PA41", "PA42", "PA43", "PA44", "PA45", "PA46", "PA47", "PA48", "PA49", "PA60", "PA61", "PA62", "PA63", "PA64", "PA65", "PA66", "PA67", "PA68", "PA69", "PA70", "PA71", "PA72", "PA73", "PA74", "PA75", "PA76", "PA77", "PA78", "PH17", "PH18", "PH19", "PH20", "PH21", "PH22", "PH23", "PH24", "PH25", "PH26", "PH30", "PH31", "PH32", "PH33", "PH34", "PH35", "PH36", "PH37", "PH38", "PH39", "PH40", "PH41", "PH42", "PH43", "PH44", "PH49", "PH50", "PO30", "PO31", "PO32"],
    localPostcodes: ["M", "SK", "OL", "WA", "WN", "BL"],
    lowValueThreshold: 15000 // £150 in pence
  };
  
  /**
   * @param {RunInput} input
   * @returns {FunctionRunResult}
   */
  export function hideRun(input) {
    const zip = input.cart.deliveryGroups[0]?.deliveryAddress?.zip ?? "";
    const cartTotal = input.cart.lines.reduce((total, line) => 
      total + (parseFloat(line.cost.totalAmount.amount) * 100 || 0), 0);
    
    const allOptions = input.cart.deliveryGroups[0]?.deliveryOptions ?? [];
  
    // Helper function to hide all except specified options
    const hideAllExcept = (optionsToKeep) => {
      return allOptions
        .filter(option => !optionsToKeep.includes(option.title))
        .map(option => /** @type {Operation} */({
          hide: { deliveryOptionHandle: option.handle }
        }));
    };
  
    // Condition 1: Remote Delivery
    if (configuration.remoteDeliveryPostcodes.some(prefix => zip.startsWith(prefix))) {
      return { operations: hideAllExcept(["Remote delivery"]) };
    }

    const hasOutOfStockItem = input.cart.lines.some(line => {
        const inventoryStatus = line.attribute?.value;
        return inventoryStatus === 'out_of_stock';
      });
    
  
    // Out of stock
    if (hasOutOfStockItem) {
      return { operations: hideAllExcept(["Delivery in 5-14 days"]) };
    }
    
    
    // Condition 2: Cart under £150
    if (cartTotal < configuration.lowValueThreshold) {
      return { operations: hideAllExcept(["DPD tracked 24-48hr delivery", "Collect"]) };
    }

    
  
 // Condition 3: Local Delivery with tag check
if (configuration.localPostcodes.some(prefix => zip.startsWith(prefix))) {
    const cartHasTaggedItem = input.cart.lines.some(line => {
      if ('product' in line.merchandise) {
        return line.merchandise.product?.hasAnyTag ?? false;
      }
      return false;
    });
  
    if (cartHasTaggedItem) {
      return { operations: hideAllExcept(["1 man delivery - local", "2 man delivery - local"]) };
    } else {
      return { operations: hideAllExcept(["1 man delivery - local", "2 man delivery - local", "Collect"]) };
    }
  }

    // Condition 4: Check if installation is selected in a non-local area
    const cartHasTaggedItem = input.cart.lines.some(line => {
        if ('product' in line.merchandise) {
          return line.merchandise.product?.hasAnyTag ?? false;
        }
        return false;
      });
      
      // New condition for tagged items
      if (cartHasTaggedItem) {
        return { operations: hideAllExcept(["2 man delivery - choice of date"]) };
      }

    
  
    // Condition 4: Default case (not remote, not local, cart >= £150)
    return { operations: hideAllExcept(["1 man delivery - choice of date", "2 man delivery - choice of date", "Collect"]) };
  }