// @ts-check
// 60f367b8-f0f8-4093-ac2d-1ad5ac133a56 
//"gid://shopify/DeliveryCustomization/13369414"
// Use JSDoc annotations for type safety
/**
* @typedef {import("../generated/api").RunInput} RunInput
* @typedef {import("../generated/api").FunctionRunResult} FunctionRunResult
* @typedef {import("../generated/api").Operation} Operation
*/

// The configured entrypoint for the 'purchase.delivery-customization.run' extension target
/**
* @param {RunInput} input
* @returns {FunctionRunResult}
*/
export function run(input) {
    // The message to be added to the delivery option
    const message = "";
  
    let toRename = input.cart.deliveryGroups
      // Filter for delivery groups with a shipping address containing the affected state or province
      .filter(group => group.deliveryAddress?.zip &&
        // Use the configured province code instead of a hardcoded value
        group.deliveryAddress.zip.startsWith("zzz"))
      // Collect the delivery options from these groups
      .flatMap(group => group.deliveryOptions)
      // Construct a rename operation for each, adding the message to the option title
      .map(option => /** @type {Operation} */({
        rename: {
          deliveryOptionHandle: option.handle,
          title: option.title ? `${option.title} - ${message}` : message
        }
      }));
  
    // The @shopify/shopify_function package applies JSON.stringify() to your function result
    // and writes it to STDOUT
    return {
      operations: toRename
    };
  };
  