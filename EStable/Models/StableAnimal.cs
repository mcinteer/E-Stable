namespace EStable.Models
{
    public class StableAnimal
    {
        public int StableAnimalId { get; set; }
        public int StableId { get; set; }
        public string StableName { get; set; }
        public string RacingName { get; set; }
        public string Sire { get; set; }
        public string Dam { get; set; }
        public string Gender { get; set; }
        public string DateOfBirth { get; set; }
        public string Colour { get; set; }
        public string Markings { get; set; }

        public StableAnimal()
        {
            
        }
        public StableAnimal(string racingName, string stableName, string sire, string dam, string gender, string dateOfBirth, string colour, string markings)
        {
            RacingName = racingName;
            StableName = stableName;
            Sire = sire;
            Dam = dam;
            Gender = gender;
            DateOfBirth = dateOfBirth;
            Colour = colour;
            Markings = markings;
        }
    }
}