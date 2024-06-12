import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Text,
  DatePicker,
  useApplyMetafieldsChange,
  useDeliveryGroups,
  useApi,
  reactExtension,
  useShippingAddress,
} from "@shopify/ui-extensions-react/checkout";

reactExtension("purchase.checkout.shipping-option-list.render-after", () => (
  <Extension />
));

export default function Extension() {
  const [selectedDate, setSelectedDate] = useState("");
  const [availableDates, setAvailableDates] = useState([]);
  const [yesterday, setYesterday] = useState("");

  const { extension } = useApi();
  const { target } = extension;

  const deliveryGroups = useDeliveryGroups();
  const shippingAddress = useShippingAddress();

  // Set a function to handle updating a metafield
  const applyMetafieldsChange = useApplyMetafieldsChange();

  // Define the metafield namespace and key
  const metafieldNamespace = "deliveryApp";
  const metafieldKey = "deliverySchedule";

  // Function to fetch available dates based on postcode
  const fetchAvailableDates = async (postcode) => {
    try {
      const response = await fetch(`https://awodeliverydates-production.up.railway.app/getdeliverydates?postcode=${postcode}`);
      const data = await response.json();
      setAvailableDates(data.dates); // Assuming the response contains a dates array
      console.log(data.dates);
    } catch (error) {
      console.error("Error fetching available dates:", error);
    }
  };

  useEffect(() => {
    // Log the shipping address for debugging
    console.log("Shipping Address: ", shippingAddress);

    if (!shippingAddress) return;

    const postcode = shippingAddress?.zip;

    // Log the postcode for debugging
    console.log("Postcode: ", postcode);

    if (postcode) {
      fetchAvailableDates(postcode);
    }
  }, [shippingAddress]);

  // Sets the selected date to today, unless today is Sunday, then it sets it to tomorrow
  useMemo(() => {
    let today = new Date();

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    let deliveryDate;
    if (today.getDay() === 0) {
      deliveryDate = tomorrow;
    } else {
      deliveryDate = today;
    }

    setSelectedDate(formatDate(deliveryDate));
    setYesterday(formatDate(yesterday));
  }, []);

  // Set a function to handle the Date Picker component's onChange event
  const handleChangeDate = useCallback(
    (selectedDate) => {
      setSelectedDate(selectedDate);
      // Apply the change to the metafield
      applyMetafieldsChange({
        type: "updateMetafield",
        namespace: metafieldNamespace,
        key: metafieldKey,
        valueType: "string",
        value: selectedDate,
      });
    },
    [applyMetafieldsChange]
  );

  // Boolean to check if Express is selected
  const isExpressSelected = () => {
    if (
      target !== "purchase.checkout.shipping-option-list.render-after" ||
      !deliveryGroups ||
      deliveryGroups.length === 0
    ) {
      return false;
    }

    const expressHandle = deliveryGroups[0].deliveryOptions.find(
      (method) => method.title === "Choice of date"
    )?.handle;

    return expressHandle === deliveryGroups[0].selectedDeliveryOption?.handle;
  };

  // Render the extension components if Express is selected
  return isExpressSelected() ? (
    <>
      <Text variant="bodyLg" as="p">
        Select a date for delivery
      </Text>
      <DatePicker
        selected={selectedDate}
        onChange={handleChangeDate}
        disabled={[
          "Sunday",
          "Saturday",
          { end: yesterday },
          { start: "2024-06-12", end: "2024-06-18" },
        ]}
        availableDates={availableDates}
      />
    </>
  ) : null;
}

const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
