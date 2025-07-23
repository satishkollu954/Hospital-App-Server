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
          .map((doc, i) => `${i + 1}.${doc.Name} - ${doc.Specialization}`)
          .slice(0, 10) // limit first 10
          .map((line) => ({
            text: { text: [line] },
            platform: "PLATFORM_UNSPECIFIED",
          }));

        docList.push({
          text: {
            text: [
              "...and more. You can see all doctors in the 'Doctors' section.",
            ],
          },
        });

        return res.json({
          fulfillmentMessages: [
            {
              text: {
                text: ["🧑‍⚕️ Here are our doctors:"],
              },
            },
            ...docList,
          ],
        });

      case "GetHospitalLocations":
        const state = parameters["geo-state"];
        let query = {};
        if (state) query = { state: new RegExp(state, "i") };

        const locations = await Location.find(query, "locationName city state");
        if (!locations.length) {
          return res.json(
            dialogflowResponse(
              `Sorry, we don’t have any branches in ${
                state || "the specified area"
              }.`
            )
          );
        }
        const locList = locations
          .map((l) => `${l.locationName} (${l.city}, ${l.state})`)
          .join("\n");
        return res.json(dialogflowResponse(`🏥 Our branches:\n${locList}`));

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

        // if (!specialization) {
        //   return res.json(
        //     dialogflowResponse("Please specify a specialization.")
        //   );
        // }

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
        const doctorQuery = parameters["person"]?.name || parameters["person"];
        if (!doctorQuery) {
          return res.json(
            dialogflowResponse("Please specify the doctor's name.")
          );
        }

        const leaveDoctor = await DoctorLeave.findOne({
          doctor: new RegExp(doctorQuery, "i"),
        });
        if (leaveDoctor) {
          return res.json(
            dialogflowResponse(
              `📅 Dr. ${leaveDoctor.doctor} is on leave from ${leaveDoctor.from} to ${leaveDoctor.to}.`
            )
          );
        } else {
          return res.json(
            dialogflowResponse(`✅ Dr. ${doctorQuery} is currently available.`)
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
    return res.json(dialogflowResponse("Something wrong. Please try again."));
  }
});

module.exports = router;
