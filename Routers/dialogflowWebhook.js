const express = require("express");
const router = express.Router();
const Doctor = require("../Models/Doctor"); // Assuming Doctor model exists
const Location = require("../Models/HospitalLocation"); // Assuming Location model exists
//const HospitalInfo = require("../Models/HospitalInfo"); // You can create this model if needed

// Helper: Respond with Dialogflow format
function dialogflowResponse(text) {
  return { fulfillmentText: text };
}

// Webhook route
router.post("/webhook", async (req, res) => {
  const intent = req.body.queryResult.intent.displayName;

  try {
    switch (intent) {
      case "GetDoctorList":
        const doctors = await Doctor.find(
          {},
          "Name Designation Specialization"
        );
        const docList = doctors
          .map((doc, i) => `${i + 1}. Dr. ${doc.Name} (${doc.Specialization})`)
          .join("\n");
        return res.json(
          dialogflowResponse(`Here is the list of our doctors:\n${docList}`)
        );

      case "GetHospitalLocations":
        const locations = await Location.find({}, "locationName");
        const locList = locations.map((loc) => loc.locationName).join(", ");
        return res.json(dialogflowResponse(`We have hospitals at: ${locList}`));

      case "GetContactDetails":
        return res.json(
          dialogflowResponse(
            `You can contact us at:\n📞 +91-9876543210\n📧 hospital@example.com`
          )
        );

      case "GetEmergencyHelp":
        return res.json(
          dialogflowResponse(
            `🚨 For emergency, please call our 24x7 helpline at +91-9999999999.`
          )
        );

      case "GetDoctorWorkingHours":
        const doctorName = req.body.queryResult.parameters["person"];
        const doctor = await Doctor.findOne({ Name: doctorName });
        if (doctor) {
          return res.json(
            dialogflowResponse(
              `Dr. ${doctor.Name} is available from ${doctor.From} to ${doctor.To}`
            )
          );
        } else {
          return res.json(dialogflowResponse("Sorry, doctor not found."));
        }

      default:
        return res.json(dialogflowResponse("Sorry, I didn't understand that."));
    }
  } catch (err) {
    console.error("Webhook error:", err);
    return res.json(
      dialogflowResponse("Something went wrong. Please try again later.")
    );
  }
});

module.exports = router;
