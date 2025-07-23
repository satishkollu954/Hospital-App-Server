const express = require("express");
const router = express.Router();
const Doctor = require("../Models/Doctor");
const Location = require("../Models/HospitalLocation");
const FAQ = require("../Models/faqModel");
const Disease = require("../Models/Disease");
const { appointmentModel: Appointment } = require("../Models/appointment"); // ✅ FIXED
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
  const intent = req.body.queryResult.intent?.displayName || "";
  const action = req.body.queryResult.action || "";
  const parameters = req.body.queryResult.parameters || {};

  if (action.startsWith("smalltalk.")) {
    console.log("💬 Small Talk triggered, skipping webhook response.");
    return res.json({}); // return empty to let Dialogflow use Small Talk answer
  }

  try {
    switch (intent) {
      case "GetDoctorList":
        const doctors = await Doctor.find(
          {},
          "Name Designation Specialization"
        );

        const docList = doctors
          .map((doc, i) => `${i + 1}. ${doc.Name} - ${doc.Specialization}`)
          .slice(0, 10);

        const doctorMessage = `🧑‍⚕️ Here are our doctors:\n${docList.join(
          "\n"
        )}\n\n...and more in our Doctors section.`;

        return res.json(dialogflowResponse(doctorMessage));

      case "GetHospitalLocations":
        const stateParam = parameters["geo-state"];
        let stateQuery = {};

        if (stateParam) {
          stateQuery = { State: new RegExp(stateParam, "i") }; // case-insensitive search
        }

        const hospitalLocations = await Location.find(stateQuery);

        if (!hospitalLocations.length) {
          return res.json(
            dialogflowResponse(
              `❌ Sorry, we don’t have any branches in ${
                stateParam || "that area"
              }.`
            )
          );
        }

        const locList = hospitalLocations
          .map((location) => {
            const branches = location.branches
              .map(
                (branch, i) =>
                  `${i + 1}. 🏥 ${branch.name}\n  📞 ${
                    branch.phone
                  }\n📍 [Map](${branch.mapUrl})`
              )
              .join("\n\n");
            return `📍 *${location.State}*:\n${branches}`;
          })
          .join("\n\n");

        return res.json(
          dialogflowResponse(`🏥 Our hospital branches:\n\n${locList}`)
        );

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
        let doctorName = parameters["doctorName"];
        if (typeof doctorName === "object" && doctorName.name) {
          doctorName = doctorName.name;
        }
        if (!doctorName || typeof doctorName !== "string") {
          return res.json(
            dialogflowResponse("Please specify the doctor's name.")
          );
        }

        doctorName = doctorName.replace(/^Dr\.?\s*/i, "");

        const doctor = await Doctor.findOne({
          Name: new RegExp(doctorName, "i"),
        });

        if (doctor) {
          return res.json(
            dialogflowResponse(
              `🩺 ${doctor.Name} is available from ${doctor.From} to ${doctor.To}.`
            )
          );
        } else {
          return res.json(
            dialogflowResponse(
              `❌ Sorry, Dr. ${doctorName} is not available in our hospital. You can ask for another doctor or say "List doctors".`
            )
          );
        }

      case "GetFAQs":
        const faqs = await FAQ.find({}, "question answer");
        const faqList = faqs
          .map((faq) => `❓ ${faq.question}\n💬 ${faq.answer}`)
          .join("\n\n");
        return res.json(dialogflowResponse(faqList));

      case "GetDiseases":
        const diseases = await Disease.find({}, "disease description");
        const diseaseList = diseases.map((d) => `🦠 ${d.disease}`).join("\n");
        return res.json(
          dialogflowResponse(
            `Here are some diseases we handle:\n${diseaseList}`
          )
        );

      case "GetAppointments":
        const email = parameters["email"];
        if (!email) {
          return res.json(
            dialogflowResponse(
              "📩 Please provide your email address to retrieve your appointments."
            )
          );
        }

        const sanitizedEmail = email.trim().toLowerCase();
        const userAppointments = await Appointment.find({
          email: sanitizedEmail,
        });

        if (!userAppointments.length) {
          return res.json(
            dialogflowResponse(
              `🔍 No appointments found for ${sanitizedEmail}.`
            )
          );
        }

        const apptText = userAppointments
          .map((a, i) => {
            const formattedDate = new Date(a.date).toLocaleDateString();
            return `${i + 1}. 📅 ${formattedDate} 🕒 ${
              a.time || "N/A"
            }\n👨‍⚕️ Dr. ${a.doctor} for ${a.reason} - Status: ${a.status}`;
          })
          .join("\n\n");

        return res.json(
          dialogflowResponse(`📋 Your Appointments:\n\n${apptText}`)
        );

      case "GetDoctorsBySpecialization":
        const specialization = parameters["specialization"];
        const filteredDoctors = await Doctor.find(
          { Specialization: { $regex: new RegExp(specialization, "i") } },
          "Name Designation Specialization"
        );

        if (!filteredDoctors.length) {
          return res.json(
            dialogflowResponse(
              `❌ No doctors found for specialization: ${specialization}`
            )
          );
        }

        const specDocList = filteredDoctors
          .map((doc, i) => `${i + 1}. ${doc.Name} (${doc.Designation})`)
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
            "🤖 I'm not sure how to help with that yet. You can ask about doctors, appointments, or say 'help'."
          )
        );

      default:
        return res.json(
          dialogflowResponse("❌ Sorry, I didn't understand that request.")
        );
    }
  } catch (err) {
    console.error("❌ Webhook error:", err);
    return res.json(
      dialogflowResponse("Something went wrong. Please try again later.")
    );
  }
});

module.exports = router;
