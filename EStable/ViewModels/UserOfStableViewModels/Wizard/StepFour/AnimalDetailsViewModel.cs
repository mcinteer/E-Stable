using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Script.Serialization;

namespace EStable.ViewModels.UserOfStableViewModels.Wizard.StepFour
{
    public class AnimalDetailsViewModel : BaseUserOfStableViewModel
    {
        public List<AnimalViewModel> Animals { get; set; }
        
        
        public string GetAnimalJson()
        {
            var jss = new JavaScriptSerializer();
            return jss.Serialize(Animals);
        }
    }

    public class AnimalViewModel
    {
        public string RacingName { get; set; }
        public string StableName { get; set; }
        public string Sire { get; set; }
        public string Dam { get; set; }
        public string Gender { get; set; }
        public string DateOfBirth { get; set; }
        public string Colour { get; set; }
        public string Markings { get; set; }
    }
}