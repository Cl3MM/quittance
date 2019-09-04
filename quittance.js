// npm i -S html-pdf fs-extra pug moment nodemailer nodemailer-html-to-text
"use strict"

const creds = require("./creds")
const nodemailer = require("nodemailer")
const moment = require("moment")
moment.locale("fr")

const fs = require("fs-extra")
// const logFile = `./logs/${moment().format('YYYY-MM-DD')}.log`
// fs.ensureFileSync(logFile)

const log = txt => {
  // fs.outputFileSync(logFile, `${moment().toISOString()} ${txt.toString().trimRight(' ').trimRight('\n')}` + '\n', { flag: 'a'})
  console.log(`${moment().toISOString()} ${txt.toString()}`)
}

log(`==== starting quittance task ====`)
const pug = require("pug")
const pdf = require("html-pdf")
const options = {
  zoomFactor: 1,
  type: "pdf",
  quality: "90",
  // height: "297mm",
  // width: "210mm",
  format: "A3",
  base: `file:///${__dirname.replace(/\\/g, "\\\\")}`.replace(/\//g, "\\")
}
// Compile the source code
const fn = pug.compileFile("./quittance.pug")

const params = {
  num: moment().diff(moment([2017, 6, 1]), "months") + 1,
  img: `${options.base}//signature.jpg`.replace(/\//g, "\\"),
  from: moment()
    .startOf("M")
    .format("Do MMMM YYYY"),
  to: moment()
    .endOf("M")
    .format("Do MMMM YYYY"),
  on: moment()
    .date(3)
    .format("DD MMMM YYYY"),
  date: moment().format("DD MMMM YYYY"),
  name: creds.name,
  loyer: creds.loyer,
  charges: creds.charges,
  total: ('' + ( +( creds.loyer.replace(',', '.')) + +(creds.charges.replace(',', '.'))).toFixed(2)).replace('.', ',')
}
log(`pug params:
${JSON.stringify(params, null, 2)}
`)

// Render a set of data
const html = fn(params)
const quittanceName = `quittance_${moment().format("YYYY-MM")}.pdf`

log(`quittance file name: ${quittanceName}`)

const transporter = nodemailer.createTransport({
  secure: true,
  debug: true,
  service: "Gmail",
  auth: {
    user: creds.user,
    pass: creds.pass
  }
})

log(`generating quittance...`)
pdf.create(html, options).toBuffer((err, buffer) => {
  if (err) {
    log(`quittance generation failed:`)
    log(err)

    transporter.sendMail(
      {
        from: creds.from,
        to: creds.to,
        subject: `[QUITTANCE] 👻 Erreur lors de l'envoi du mail 👻`,
        text: `Une erreur est survenue lors de l'envoi de la quittance ${quittanceName} :
${err}`,
        attachments: [
          {
            filename: quittanceName,
            content: buffer
          },
          {
            filename: logFile,
            content: fs.createReadStream(logFile)
          }
        ]
      },
      (error, info) => {
        if (error) {
          log(`an error occured while sending error email`)
          log(error)
          return console.log(error)
        }
        log(`email sent successfully !`)
        console.log("Message %s sent: %s", info.messageId, info.response)
      }
    )
    return console.log(err)
  }
  log(`quittance generated, sending email....`)

  const htmlToText = require("nodemailer-html-to-text").htmlToText
  let mailOptions = {
    from: creds.from,
    to: creds.to,
    subject: `Quittance ${moment().format("DD-MM-YYYY HH:mm")} ✔`,
    html: `<h3>Bonjour ${creds.name},</h3>
<p>Veuillez trouver ci-joint la quittance de loyer pour le mois de ${moment().format(
      "MMMM YYYY"
    )}, pour votre appartement Villa Chartreux à Lyon 01.</p>
<p>Bien Cordialement,</p>
<p>F.Roullet-Chirol</p>`,
    attachments: [
      {
        filename: quittanceName,
        content: buffer
      }
    ]
  }
  if (creds.bcc) {
    mailOptions.bcc = creds.bcc
  }

  if (creds.debug) {
    log(`writing to local file`)
    const wstream = fs.createWriteStream("quittance.pdf")
    wstream.write(buffer)
    wstream.end()
  } else {
    transporter.use("compile", htmlToText())
    // send mail with defined transport object
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        log(`an error occured while sending email`)
        log(error)
        return console.log(error)
      }
      log(`email sent successfully !`)
      console.log("Message %s sent: %s", info.messageId, info.response)
    })
  }
})
