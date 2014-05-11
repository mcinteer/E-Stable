using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Script.Serialization;

namespace EStable.ViewModels.UserOfStableViewModels.Wizard.StepFive
{
    public class AnimalOwnershipViewModel : BaseUserOfStableViewModel
    {
        public List<OwnershipViewModel> OwnershipViewModel { get; set; }
    }

    public class OwnershipViewModel
    {
        public List<WizardOwnershipViewModel> WizardOwnership { get; set; }
        public string AnimalName { get; set; }

        public string GetOwnershipJson()
        {
            var jss = new JavaScriptSerializer();
            return jss.Serialize(this);
        }
    }

    public class WizardOwnershipViewModel
    {
        public string OwnerName { get; set; }
        public string PercentOwned { get; set; }
        public string HasBeenInvoiced { get; set; }
        public string OwnerEmail { get; set; }
        public string IsSyndicate { get; set; }
        public string SyndicateName { get; set; }
        public string DayPhone { get; set; }
        public string NightPhone { get; set; }
        public string MobilePhone { get; set; }
        public string Address { get; set; }
    }

    public class AjaxStableOwnershipViewModel : BaseUserOfStableViewModel
    {
        public Dictionary<string, List<AjaxAnimalOwnershipViewModel>> AnimalOwnerships { get; set; }

        public AjaxStableOwnershipViewModel()
        {
            AnimalOwnerships = new Dictionary<string, List<AjaxAnimalOwnershipViewModel>>();
        }

        public string GetOwnershipJson(string animalName)
        {
            List<AjaxAnimalOwnershipViewModel> animalOwnerships;
            AnimalOwnerships.TryGetValue(animalName, out animalOwnerships);
            var jss = new JavaScriptSerializer();
            return jss.Serialize(animalOwnerships);
        }
    }


    public class AjaxAnimalOwnershipViewModel
    {
        //public List<WizardOwnershipViewModel> WizardOwnership { get; set; }
        public string AnimalName { get; set; }

        public string OwnerName { get; set; }
        public string PercentOwned { get; set; }
        public string HasBeenInvoiced { get; set; }
        public string OwnerEmail { get; set; }
        public string IsSyndicate { get; set; }
        public string SyndicateName { get; set; }
        public string DayPhone { get; set; }
        public string NightPhone { get; set; }
        public string MobilePhone { get; set; }
        public string Address { get; set; }

        public string GetOwnershipJson()
        {
            var jss = new JavaScriptSerializer();
            return jss.Serialize(this);
        }
    }
}