using System;
using System.Collections.Generic;
using System.Linq;
using System.Web.Mvc;
using EStable.Bouncers;
using EStable.Constants;
using EStable.Domain;
using EStable.Models.Wizard;
using EStable.Services;
using EStable.ViewModels.UserOfStableViewModels.Wizard.Factories;
using EStable.ViewModels.UserOfStableViewModels.Wizard.StepFive;
using EStable.ViewModels.UserOfStableViewModels.Wizard.StepFour;
using EStable.ViewModels.UserOfStableViewModels.Wizard.StepOne;
using EStable.ViewModels.UserOfStableViewModels.Wizard.StepThree;
using EStable.ViewModels.UserOfStableViewModels.Wizard.StepTwo;
using EStable.ViewModels.UserOfStableViewModels.Wizard.Step_Six;

namespace EStable.Controllers
{
    public class WizardController : Controller
    {
        private readonly WizardService _wizardService = new WizardService();

        private readonly IFinancialInformationViewModelFactory _financialInformationViewModelFactory =new FinancialInformationViewModelFactory();
        private readonly IContactDetailsViewModelFactory _contactDetailsViewModelFactory =new ContactDetailsViewModelFactory();
        private readonly IChargeTypeViewModelFactory _chargeTypeViewModelFactory =new ChargeTypeViewModelFactory();
        private readonly IStableChargeTypeBouncer _stableChargeTypeBouncer =new StableChargeTypeBouncer();
        private readonly IWizardBouncer _wizardBouncer =new WizardBouncer();
        private readonly IStandardChargeTypeBouncer _standardChargeTypeBouncer = new StandardChargeTypeBouncer();
        private readonly IAnimalDetailsViewModelFactory _animalDetailsViewModelFactory = new AnimalDetailsViewModelFactory();
        private readonly IStableAnimalBouncer _stableAnimalBouncer = new StableAnimalBouncer();
        private readonly IAnimalOwnerBouncer _animalOwnerBouncer = new AnimalOwnerBouncer();
        private readonly IAnimalOwnerViewModelFactory _animalOwnerViewModelFactory = new AnimalOwnerViewModelFactory();
        private readonly IWizardSummaryViewModelFactory _summaryViewModelFactory = new WizardSummaryViewModelFactory();

        public WizardController()
        {
            
        }
        //
        // GET: /Wizard/
        public ActionResult Index()
        {
            return GetStepZero();
        }

        private ActionResult GetStepZero()
        {
            var model = new StableWizardBase();
            return View("WizardStart",model);
        }

        private SummaryWizard GetWizard(string key, string step)
        {
            var wizard = new SummaryWizard();
            if (Request.Browser.Cookies)
            {
                var cookie = Request.Cookies[key];
                if (cookie != null)
                {
                    wizard = new SummaryWizard(cookie, key, step);
                }
            }
            return wizard;
        }

        #region GetTheSteps

        private ActionResult GetStepOne(string email)
        {
            var contact = _wizardService.GetWizard(email).ContactInformation;
            contact.PossibleStableType = contact.PossibleStableType.Distinct().ToList();
            contact.Email = email;

            var viewModel = _contactDetailsViewModelFactory.ToViewModel(contact);
            return View("ContactInformationStepOne", viewModel);
        }

        private ActionResult GetStepTwo(string email)
        {
            var financialInformation = _wizardService.GetWizard(email).FinancialInformation;
            financialInformation.Email = email;

            var viewModel = _financialInformationViewModelFactory.ToViewModel(financialInformation);
            return View("FinancialDetailsStepTwo", viewModel);
        }

        private ActionResult GetStepThree(string email)
        {
            var chargeTypes = _wizardService.GetWizard(email).ChargeTypes;
            chargeTypes.Email = email;
            var viewModel = _chargeTypeViewModelFactory.ToViewModel(chargeTypes);
            return View("StableTypeChargesStepThree", viewModel);
        }

        private ActionResult GetStepFour(string email)
        {
            var animalDetails = _wizardService.GetWizard(email).AnimalDetails;
            animalDetails.Email = email;
            var viewModel = _animalDetailsViewModelFactory.ToViewModel(animalDetails);
            return View("AnimalDetailsStepFour", viewModel);
        }

        private ActionResult GetStepFive(string email)
        {
            var wizard = _wizardService.GetWizard(email);
            var ownerships = wizard.AnimalOwners.AnimalOwnerships;
            
            var viewModel = _animalOwnerViewModelFactory.ToViewModel(ownerships, email);
            
            if (viewModel.AnimalOwnerships.Count != wizard.AnimalDetails.StableAnimals.Count)
            // If there are animal's yet to have owners defined for them, we need to add them to the dictionary
            // so a table is generated for those animals on the page/
            {
                // Find all of the animal's which don't have owners
                var animalNames =
                    wizard.AnimalDetails.StableAnimals.Select(an => an.RacingName)
                          .Except(viewModel.AnimalOwnerships.Select(an => an.Key));
                
                foreach (var animalName in animalNames)
                    // Add those animals to the VM
                {
                    viewModel.AnimalOwnerships.Add(animalName, new List<AjaxAnimalOwnershipViewModel>());
                }
            }
            return View("OwnersStepFive", viewModel);
        }

        private ActionResult GetStepSix(string email)
        {
            var wizard = _wizardService.GetWizard(email);
            var viewModel = _summaryViewModelFactory.ToViewModel(wizard, email);
            return View("SummaryStepSix", viewModel);
        }

        private ActionResult GetStepSeven(SummaryWizard summaryWizard)
        {
            const string step = Codes.Cookies.Wizard.StepSeven.Key;
            var key = step + summaryWizard.Email;
            var wizard = GetWizard(key, step);
            wizard.Email = summaryWizard.Email;
            return View("OwnershipStepSeven", wizard);
        }


        private ActionResult GetStepEight()//TODO: SummaryWizard wizard)
        {
            const string step = Codes.Cookies.Wizard.StepEight.Key;
            var key = step;//TODO + wizard.Email;
            var wizard = GetWizard(key, step);
            return View("SummaryStepEight", wizard);
        }

        #endregion

        #region PostTheSteps

        public ActionResult PostStepZero(StableWizardBase wizardBase)
        {
            if (false == ModelState.IsValid)
            {
                wizardBase.IsValid = false;
                return View("WizardStart", wizardBase);
            }

            var wizard = new SummaryWizard();
            var fileName = new GetStableRegFileInfoResponse();

            fileName = _wizardService.GetStableRegFileInfo(wizardBase.Email);


            if (fileName.SystemFileName != null)
            {
                // XML file exists, no need to save a new one. 
            }
            else
            {
                var newFileName = Guid.NewGuid().ToString();
                _wizardService.SaveStableRegFileName(newFileName, wizardBase.Email);
                wizard.Email = wizardBase.Email;
                wizard.SaveXml(newFileName);
            }


            return GetStepOne(wizardBase.Email);
        }

        [HttpPost]
        public ActionResult SaveContactDetails(ContactDetailsViewModel contactDetails, string email)
        {
            if (false == ModelState.IsValid)
            {
                contactDetails.InitializePossibleStableType();
                contactDetails.IsValid = false;
                return View("ContactInformationStepOne", contactDetails);
            }
            
            _wizardBouncer.SaveContactDetails(contactDetails, email);
            return GetStepTwo(email);
        }
        
        [HttpPost]
        public ActionResult PostStepTwo(FinancialInformationViewModel financialData, string submit, string email)
        {
            if (false == ModelState.IsValid)
            {
                financialData.IsValid = false;
                return View("FinancialDetailsStepTwo", financialData);
            }
            SaveFinancialData(financialData, email);
            switch (submit)
            {
                case "Next":
                    return GetStepThree(email);
                case "Back":
                    return GetStepOne(email);
                default:
                    throw new Exception("Invalid form submission, please select either back or next");
            }
        }

        private void SaveFinancialData(FinancialInformationViewModel financialData, string email)
        {
            _wizardBouncer.SaveFinancialData(financialData, email);
        }

        public ActionResult PostStepThree(SummaryWizard wizard, string submit, string email)
        {
            switch (submit)
            {
                case "Next":
                    return GetStepFour(email);
                case "Back":
                    return GetStepTwo(email);
                default:
                    throw new Exception("Invalid form submission, please select either back or next");
            }
        }

        public ActionResult PostStepFour(SummaryWizard wizard, string submit, string email)
        {
            switch (submit)
            {
                case "Next":
                    return GetStepFive(email);
                case "Back":
                    return GetStepThree(email);
                default:
                    throw new Exception("Invalid form submission, please select either back or next");
            }
        }

        public ActionResult PostStepFive(SummaryWizard wizard, string submit, string email)
        {
            switch (submit)
            {
                case "Next":
                    return GetStepSix(email);
                case "Back":
                    return GetStepFour(email);
                default:
                    throw new Exception("Invalid form submission, please select either back or next");
            }
        }



        public ActionResult PostStepSix(WizardSummaryViewModel viewModel, string submit, string email)
        {
            switch (submit)
            {
                case "Provision Stable":
                    return GetStepFive(email);
                case "Back":
                    return GetStepFive(email);
                default:
                    throw new Exception("Invalid form submission, please select either back or next");
            }
        }

        public ActionResult PostStepSeven(SummaryWizard wizard, string submit, string email)
        {
            if (Request.Browser.Cookies){SaveStepSevenCookie(wizard);}
            else{return View("EnableCookies");}

            wizard.Email = email;

            switch (submit)
            {
                case "Next":
                    return GetStepEight();
                case "Back":
                    return GetStepSix(email);
                default:
                    throw new Exception("Invalid form submission, please select either back or next");
            }
        }

        public ActionResult PostStepEight()
        {
            throw new NotImplementedException();
        }

        #endregion

        #region SaveTheCookies

        private void SaveStepZeroCookie(StableWizardBase wizardBase)
        {
            Response.Cookies[Codes.Cookies.Wizard.StepZero.Key][Codes.Cookies.Wizard.StepZero.Email] = wizardBase.Email;
            Response.Cookies[Codes.Cookies.Wizard.StepZero.Key].Expires = DateTime.Now.AddDays(1d);
        }

        private void SaveStepOneCookie(SummaryWizard wizard)
        {
            var contact = wizard.ContactInformation;
            string key = Codes.Cookies.Wizard.StepOne.Key + wizard.Email;
            Response.Cookies[key][Codes.Cookies.Wizard.StepOne.Email] = contact.Email;
            Response.Cookies[key][Codes.Cookies.Wizard.StepOne.StableName] =
                contact.StableName;
            Response.Cookies[key][Codes.Cookies.Wizard.StepOne.Address] = contact.Address;
            Response.Cookies[key][Codes.Cookies.Wizard.StepOne.Jurisdiction] =
                contact.Jurisdiction;
            Response.Cookies[key][Codes.Cookies.Wizard.StepOne.Phone] =
                contact.Phone;
            Response.Cookies[key][Codes.Cookies.Wizard.StepOne.Mobile] =
                contact.Mobile;
            Response.Cookies[key][Codes.Cookies.Wizard.StepOne.StableType] =
                contact.StableType;

            Response.Cookies[key].Expires = DateTime.Now.AddDays(1d);
        }

        private void SaveStepTwoCookie(SummaryWizard wizard)
        {
            var financial = wizard.FinancialInformation;
            string key = Codes.Cookies.Wizard.StepTwo.Key + wizard.Email;
            Response.Cookies[key][Codes.Cookies.Wizard.StepTwo.GSTNumber] = financial.GSTNumber;
            Response.Cookies[key][Codes.Cookies.Wizard.StepTwo.GSTRate] = financial.GSTRate;
            Response.Cookies[key][Codes.Cookies.Wizard.StepTwo.GSTEffectiveDate] = financial.GSTEffectiveDate;
            Response.Cookies[key][Codes.Cookies.Wizard.StepTwo.NextInvoiceNumber] = financial.NextInvoiceNumber;
            Response.Cookies[key][Codes.Cookies.Wizard.StepTwo.PreviousGSTRate] = financial.PreviousGSTRate;

            Response.Cookies[Codes.Cookies.Wizard.StepTwo.Key].Expires = DateTime.Now.AddDays(1d);
        }

        private void SaveStepThreeCookie(SummaryWizard wizard)
        {
            var stableType = wizard.ChargeTypes;
            string key = Codes.Cookies.Wizard.StepThree.Key + wizard.Email;
            //Response.Cookies[key][Codes.Cookies.Wizard.StepThree.SelectedStableType] = stableType.SelectedStableType;
            Response.Cookies[Codes.Cookies.Wizard.StepThree.Key].Expires = DateTime.Now.AddDays(1d);
        }


        private void SaveStepFourCookie(SummaryWizard wizard)
        {
            throw new NotImplementedException();
        }

        private void SaveStepFiveCookie(SummaryWizard wizard)
        {
            throw new NotImplementedException();
        }

        private void SaveStepSixCookie(SummaryWizard wizard)
        {
            throw new NotImplementedException();
        }

        private void SaveStepSevenCookie(SummaryWizard wizard)
        {
            throw new NotImplementedException();
        }

        #endregion

        public JsonResult GetStableCharges()
        {
            return new JsonResult();
        }

        public JsonResult SaveStableCharge(string unit, string instable, string description, string rate, string email)
        {
            var charges = _stableChargeTypeBouncer.SaveStableCharge(unit, instable, description, rate, email);
            return GetStableChargeJson(charges);
        }

        private static JsonResult GetStableChargeJson(List<StableChargeTypeViewModel> charges)
        {
            return new JsonResult()
                {
                    Data = new
                        {
                            records = charges,
                            totalRecordCount = charges.Count
                        }
                };
        }

        public ActionResult ImportStableCharges(string email)
        {
            var chargeTypes = _stableChargeTypeBouncer.ImportStableCharges(Request.Files[0], email);
            chargeTypes.Email = email;
            var viewModel = _chargeTypeViewModelFactory.ToViewModel(chargeTypes);
            return View("StableTypeChargesStepThree", viewModel);
        }

        public ActionResult ImportStandardCharges(string email)
        {
            var chargeTypes = _standardChargeTypeBouncer.ImportStandardCharges(Request.Files[0], email);
            chargeTypes.Email = email;
            var viewModel = _chargeTypeViewModelFactory.ToViewModel(chargeTypes);
            return View("StableTypeChargesStepThree", viewModel);
        }

        public JsonResult SaveStandardCharge(string description, string rate, string email)
        {
            List<StandardChargeTypeViewModel> charges = _standardChargeTypeBouncer.SaveStandardCharge(description, rate, email);
            return new JsonResult()
                {
                    Data = new
                        {
                            records = charges,
                            totalRecordCount = charges.Count
                        }
                };
        }

        public JsonResult SaveAnimal(string racingName, string stableName, string sire, string dam, string gender,
                                     string dateOfBirth, string colour, string markings, string email)
        {
            List<AnimalViewModel> animals = _stableAnimalBouncer.SaveAnimal(racingName, stableName, sire, dam, gender,
                                                                            dateOfBirth, colour, markings, email);
            return new JsonResult()
                {
                    Data = new
                        {
                            records = animals,
                            totalRecordCount = animals.Count
                        }
                };
            
        }

        public JsonResult SaveOwner(string animalName, string owner, string percentOwned, string invoiced, string ownerEmail, string syndicate, string syndicateName, string dayPhone, string nightPhone, string mobilePhone, string address, string stableEmail, string email)
        {
            List<AjaxAnimalOwnershipViewModel> owners = 
                _animalOwnerBouncer.SaveAnimalOwner(animalName, owner, percentOwned, invoiced,
                                                    ownerEmail, syndicate, syndicateName,
                                                    dayPhone, nightPhone, mobilePhone, address,
                                                    stableEmail);
            return new JsonResult()
                {
                    Data = new
                        {
                            records = owners,
                            totalRecordCount = owners.Count
                        }
                };
        }
    }
}
