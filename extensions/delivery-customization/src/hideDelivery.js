// @ts-check

/**
* @typedef {import("../generated/api").RunInput} RunInput
* @typedef {import("../generated/api").FunctionRunResult} FunctionRunResult
* @typedef {import("../generated/api").Operation} Operation
*/

//Checks
// - cart total under £150 should be DPD
// - if local and up stairs show 2 man delivery
// - if local and no stairs show 1 man delivery
// - if non-local and up stairs show AIT
// - if non-local and service show AIT
// - if remote delivery show remote delivery
// - if collection show collection
// - if large appliance local shown AWO 2 man delivery
// - if large appliance non-local shown AIT 2 man courier service
// - if out of stock show out of stock message

import postcodes from './local_postcodes.json';
import redZones from './red_zones.json';

const configuration = {
  lowValueThreshold: 15000, // £150 in pence
  weightThreshold: 30 
};

function isLocalPostcode(customerPostcode) {
  if (!customerPostcode) return false;

  // Convert to uppercase and remove spaces for consistent comparison
  const formattedPostcode = customerPostcode.toUpperCase().replace(/\s/g, '');

  // Check if the postcode starts with any of our local postcodes
  return postcodes.some(entry =>
    formattedPostcode.startsWith(entry.Postcode)
  );
}

function isRedZonePostcode(customerPostcode) {
  if (!customerPostcode) return false;

  // Convert to uppercase and remove spaces for consistent comparison
  const formattedPostcode = customerPostcode.toUpperCase().replace(/\s/g, '');

  // Check if the postcode starts with any of our red zone postcodes
  return redZones.some(entry =>
    formattedPostcode.startsWith(entry.Postcode)
  );
}

function isEligibleForDPD(cartLines) {
  return cartLines.every(line => {
    const itemPrice = parseFloat(line.cost.totalAmount.amount) * 100;
    
    // If no weight, check price
    return itemPrice < configuration.lowValueThreshold;
  });
}
export function hideRun(input) {
  const customerPostcode = input.cart.deliveryGroups[0]?.deliveryAddress?.zip;
  const cartTotal = input.cart.lines.reduce((total, line) =>
    total + (parseFloat(line.cost.totalAmount.amount) * 100 || 0), 0);

  const allOptions = input.cart.deliveryGroups[0]?.deliveryOptions ?? [];

  const isLocal = isLocalPostcode(customerPostcode);
  const isNonLocal = !isLocal;
  const isRedZone = isRedZonePostcode(customerPostcode);

  const hasLargeAppliance = input.cart.lines.some(line => {
    if ('product' in line.merchandise) {
      const productType = line.merchandise.product?.productType?.toLowerCase() ?? '';
      return productType === 'range cooker' || productType === 'american fridge freezer';
    }
    return false;
  });

  const requiresSteps = input.cart.requiresStepsAttribute?.value === 'yes';
  const hasInstallationTag = input.cart.lines.some(line => {
    if ('product' in line.merchandise) {
      return line.merchandise.product?.hasAnyTag ?? false;
    }
    return false;
  });
  const hasInstallationAttribute = input.cart.hasService?.value === 'true';
  const hasInstallation = hasInstallationTag || hasInstallationAttribute;

  // Helper function to hide all except specified options
  const hideAllExcept = (optionsToKeep) => {
    return allOptions
      .filter(option => !optionsToKeep.includes(option.title))
      .map(option => /** @type {Operation} */({
        hide: { deliveryOptionHandle: option.handle }
      }));
  };


  // Remote Delivery
  if (isRedZone) {
    return { operations: hideAllExcept(["Remote delivery"]) };
  }

  // Condition 3: They selected collection
  const isCollection = input.cart.shippingMethodAttribute?.value === 'collection';

  if (isCollection) {
    return { operations: hideAllExcept(["Collect from Trafford Park"]) };
  }
  // Large appliance delivery check (before AIT check)
  if (hasLargeAppliance) {
    if (isNonLocal) {
      return { operations: hideAllExcept(["AIT 2 man courier service"]) };
    }
    if (isLocal) {
      return { operations: hideAllExcept(["Appliance World 2 man delivery"]) };
    }
  }

        // Cart under £150
        if (isEligibleForDPD(input.cart.lines)) {
          return { operations: hideAllExcept(["DPD tracked 24-48hr delivery"]) };
        }

    //if installation and non-local show AIT only
    const AitDelivery = hasInstallation && isNonLocal;

    if (AitDelivery) {
      return { operations: hideAllExcept(["AIT 2 man courier service"]) };
    }
  
    // Add check for non-local with steps
    if (isNonLocal && requiresSteps) {
      return { operations: hideAllExcept(["AIT 2 man courier service"]) };
    }

    if (isNonLocal && !requiresSteps) {
      return { operations: hideAllExcept(["Appliance World 1 man delivery", "AIT 2 man courier service"]) };
    }

      // if local and up stairs
  if (isLocal && requiresSteps) {
    return { operations: hideAllExcept(["Appliance World 2 man delivery"]) };
  }


    
      const hasOutOfStockItem = input.cart.lines.some(line => {
        const inventoryStatus = line.attribute?.value;
        return inventoryStatus === 'out_of_stock';
      });
      

  // if local and no stairs 
  if (isLocal && !requiresSteps  && !hasOutOfStockItem) {
    return { operations: hideAllExcept(["Appliance World 1 man delivery", "Appliance World 2 man delivery"]) };
  }



      // Out of stock
      if (hasOutOfStockItem) {
        return { operations: hideAllExcept(["Available to order: We will contact you to arrange delivery"]) };
      }

      // If there are no line attributes show all options
      const hasNoLineAttributes = input.cart.lines.some(line => {
        return !line.attribute;
      });
  
      // If line attributes are missing, show all options
      if (hasNoLineAttributes && !hasInstallation) {
        return { operations: [] };  // Shows all options by not hiding any
      }

  // Condition 4: Default case 
  return { operations: hideAllExcept(["Appliance World 1 man delivery", "AIT 2 man courier service"]) };
}