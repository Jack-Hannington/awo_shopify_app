// @ts-check
// https://shopify.dev/docs/api/functions/reference/delivery-customization/graphql/common-objects/attribute
// shopify app logs --source extensions.hide-delivery

/**
* @typedef {import("../generated/api").RunInput} RunInput
* @typedef {import("../generated/api").FunctionRunResult} FunctionRunResult
* @typedef {import("../generated/api").Operation} Operation
*/

// Simplified logic:
// Small-item tag with no service. Should be Parcelforce 
// if provider = Arrow-XL then show Arrow-XL 
// if provider = Internal and no steps then show Appliance World 1 man delivery
// if provider = internal + steps or internal and Range Cooker / American fridge freezer then show Appliance World 2 man delivery
// if provider = Collection then show collection
// if no provider then show Appliance World 1 man delivery

import redZones from './red_zones.json';

function isRedZonePostcode(customerPostcode) {
  if (!customerPostcode) return false;

  // Convert to uppercase and remove spaces for consistent comparison
  const formattedPostcode = customerPostcode.toUpperCase().replace(/\s/g, '');

  // Check if the postcode starts with any of our red zone postcodes
  return redZones.some(entry =>
    formattedPostcode.startsWith(entry.Postcode)
  );
}

function isEligibleForParcelforce(cartLines) {
  // First check if any line has the appliance removal tag
  const hasApplianceRemoval = cartLines.some(line => {
    if ('product' in line.merchandise) {
      return line.merchandise.product?.hasApplianceRemoval === true;
    }
    return false;
  });

  // If there's an appliance removal service, not eligible for Parcelforce
  if (hasApplianceRemoval) {
    return false;
  }

  // Check if all items have the Small-item tag and none have Installation
  const allProductLines = cartLines.filter(line => 'product' in line.merchandise);
  
  // If no product lines, return false
  if (allProductLines.length === 0) {
    return false;
  }
  
  // Check if ALL items have the Small-item tag and NONE have Installation
  return allProductLines.every(line => 
    line.merchandise.product?.hasSmallItem === true && 
    line.merchandise.product?.hasInstallation !== true
  );
}

function hasSpecialProductType(cartLines) {
  // Check if any line has American fridge freezer or Range Cooker product type
  return cartLines.some(line => {
    if ('product' in line.merchandise) {
      const productType = line.merchandise.product?.productType;
      return productType === 'American fridge freezer' || productType === 'Range Cooker';
    }
    return false;
  });
}

export function hideRun(input) {
  const customerPostcode = input.cart.deliveryGroups[0]?.deliveryAddress?.zip;
  const allOptions = input.cart.deliveryGroups[0]?.deliveryOptions ?? [];

  // Helper function to hide all except specified options
  const hideAllExcept = (optionsToKeep) => {
    return allOptions
      .filter(option => !optionsToKeep.includes(option.title))
      .map(option => /** @type {Operation} */({
        hide: { deliveryOptionHandle: option.handle }
      }));
  };

  // 1. Cart has small items eligible for Parcelforce
  if (isEligibleForParcelforce(input.cart.lines)) {
    return { operations: hideAllExcept(["Parcelforce tracked 1-3 day delivery"]) };
  }

  // 2. Red zone fallback
  const isRedZone = isRedZonePostcode(customerPostcode);
  if (isRedZone) {
    return { operations: hideAllExcept(["Remote delivery"]) };
  }

  // 3. Get provider and other attributes
  const provider = input.cart.deliveryProvider?.value;
  const shippingMethod = input.cart.shippingMethodAttribute?.value;
  const requiresSteps = input.cart.requiresStepsAttribute?.value === 'yes';

  // 4. Collection
  if (shippingMethod === 'collection' || provider === 'Collection') {
    return { operations: hideAllExcept(["Collect from Trafford Park"]) };
  }

  // 5. Provider-based delivery options (works for both in-stock and out-of-stock)
  if (provider === 'Arrow-XL') {
    return { operations: hideAllExcept(["ArrowXL 2 Man Tracked Delivery"]) };
  }
  
  if (provider === 'Internal') {
    if (requiresSteps || hasSpecialProductType(input.cart.lines)) {
      return { operations: hideAllExcept(["Appliance World 2 man delivery"]) };
    } else {
      return { operations: hideAllExcept(["Appliance World 1 man delivery"]) };
    }
  }

  // 6. No provider - default to Internal 1 man
  return { operations: hideAllExcept(["Appliance World 1 man delivery"]) };
}
