const express = require("express");
const router = express.Router();
const Doctor = require("../Models/Doctor");
const Location = require("../Models/HospitalLocation");
const FAQ = require("../Models/faqModel");
const Disease = require("../Models/Disease");
const Appointment = require("../Models/appointment");
const DoctorLeave = require("../Models/DoctorLeave");

// Respond to Dialogflow
function dialogflowResponse(text) {
  return {
    fulfillmentText: text,
    fulfillmentMessages: [
      {
        text: {
          text: [text],
        },
      },
    ],
  };
}

// Webhook endpoint
router.post("/webhook", async (req, res) => {
  console.log("✅ Dialogflow Webhook Hit");
  console.log("🔍 Incoming Webhook Body:", JSON.stringify(req.body, null, 2));
  const intent = req.body.queryResult.intent.displayName;
  const parameters = req.body.queryResult.parameters;

  try {
    switch (intent) {
      case "GetDoctorList":
        const doctors = await Doctor.find(
          {},
          "Name Designation Specialization"
        );
        const docList = doctors
          .map((doc, i) => `${i + 1}. Dr. ${doc.Name} - ${doc.Specialization}`)
          .join("\n");
        const limitedDoctors =
          docList.split("\n").slice(0, 10).join("\n") +
          "\n...and more. Please refine your search.";
        docList.split("\n").slice(0, 10).join("\n") +
          "\n...and more. Please refine your search.";
        const responseText = `Here are our doctors:\n${limitedDoctors}`;
        console.log("🟢 Response sent:", responseText);
        return res.json(dialogflowResponse(responseText));

      case "GetHospitalLocations":
        const locations = await Location.find({}, "locationName");
        const locList = locations.map((loc) => loc.locationName).join(", ");
        return res.json(dialogflowResponse(`We are located at: ${locList}`));

      case "GetContactDetails":
        return res.json(
          dialogflowResponse(
            `📞 Phone: +91-9876543210\n📧 Email: hospital@example.com`
          )
        );

      case "GetEmergencyHelp":
        return res.json(
          dialogflowResponse(`🚨 For emergency help, call +91-9999999999.`)
        );

      case "GetDoctorWorkingHours":
        let doctorName = req.body.queryResult.parameters["doctorName"];

        // If it's an object, extract the name string
        if (typeof doctorName === "object" && doctorName.name) {
          doctorName = doctorName.name;
        }

        if (!doctorName || typeof doctorName !== "string") {
          return res.json(
            dialogflowResponse("Please specify the doctor's name.")
          );
        }

        // Clean prefix
        doctorName = doctorName.replace(/^Dr\.?\s*/i, "");

        const doctor = await Doctor.findOne(
          { Name: new RegExp(doctorName, "i") } // case-insensitive match
        );

        if (doctor) {
          return res.json(
            dialogflowResponse(
              `Dr. ${doctor.Name} is available from ${doctor.From} to ${doctor.To}`
            )
          );
        } else {
          return res.json(
            dialogflowResponse(`Sorry, I couldn’t find Dr. ${doctorName}.`)
          );
        }

      case "GetFAQs":
        const faqs = await FAQ.find({}, "question answer");
        const faqList = faqs
          .map((faq) => `Q: ${faq.question}\nA: ${faq.answer}`)
          .join("\n\n");
        return res.json(dialogflowResponse(faqList));

      case "GetDiseases":
        const diseases = await Disease.find({}, "disease description");
        const diseaseList = diseases.map((d) => `🦠 ${d.disease}`).join("\n\n");
        return res.json(dialogflowResponse(diseaseList));

      case "GetAppointments":
        const email = parameters["email"];
        const userAppointments = await Appointment.find({ email });
        if (userAppointments.length === 0) {
          return res.json(dialogflowResponse("You have no appointments."));
        }
        const apptText = userAppointments
          .map(
            (a) =>
              `📅 On ${a.date}, with Dr. ${a.doctor}, for ${a.reason} - Status: ${a.status}`
          )
          .join("\n");
        return res.json(
          dialogflowResponse(`Here are your appointments:\n${apptText}`)
        );

      case "GetDoctorsBySpecialization":
        const specialization =
          req.body.queryResult.parameters["specialization"];

        if (!specialization) {
          return res.json(
            dialogflowResponse("Please specify a specialization.")
          );
        }

        const filteredDoctors = await Doctor.find(
          { Specialization: { $regex: new RegExp(specialization, "i") } },
          "Name Designation Specialization"
        );

        if (!filteredDoctors.length) {
          return res.json(
            dialogflowResponse(
              `No doctors found for specialization: ${specialization}`
            )
          );
        }

        const specDocList = filteredDoctors
          .map((doc, i) => `${i + 1}. Dr. ${doc.Name} (${doc.Designation})`)
          .join("\n");

        return res.json(
          dialogflowResponse(
            `Here are the ${specialization} specialists:\n${specDocList}`
          )
        );

      case "GetDoctorLeaves":
        const leaveDoctorName =
          parameters["person"]?.name || parameters["person"];
        const leave = await DoctorLeave.findOne({ doctor: leaveDoctorName });
        if (leave) {
          return res.json(
            dialogflowResponse(
              `Dr. ${leaveDoctorName} is on leave from ${leave.from} to ${leave.to}.`
            )
          );
        } else {
          return res.json(
            dialogflowResponse(
              `No current leave found for Dr. ${leaveDoctorName}.`
            )
          );
        }

      case "Default Welcome Intent":
        return res.json(
          dialogflowResponse(
            "👋 Hello! Welcome to RaagviCare. How can I assist you today?"
          )
        );

      case "Default Fallback Intent":
        return res.json(
          dialogflowResponse(
            "😕 I'm sorry, I didn't understand that. Could you please rephrase?"
          )
        );

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
