## BM Helper

### Build the executable
```
npm i 
npm run compile && npm run build
```

### How to use

*Supported Project types*:

1. neural network


    ```
    bmhelper create --project_name project_test --board zedboard --project_type neural_network --n_inputs 4 --n_outputs 2 --source_neuralbond banknote.json
    ```
    This is a ZYNQ FPGA based project, it means that it is also possible to create a custom buildroot linux sdcard-image to flash an sdcard.

    As you can see, inside the project there are all the necessary tools to generate the bitstream (.bin) and the hardware (.hwh) files to program the FPGA. <br>
    In details:
    - *bmapi.json* 
    - *bmapi.mk* 
    - *bminfo.json* 
    - *buildroot.mk* 
    - *crosscompile.mk* 
    - *local.mk* 
    - *Makefile* 
    - *neuralbondconfig.json* 
    - *neurons* 
    - *simbatch.mk* 
    - *simbatch.py* 
    - *vivadoAXIcomment.sh* 

    <br />

    if you want to generate the firmware right away without delay, use the following command
    ```
    make design_bitstream
    ```
    and enjoy the bitstream generation.<br />
    You will find all the results in the *working_dir* directory. Of course you need *Vivado* in your local machine.

    If you want to directly deploy the bitstream on a board, run the command
    ```
    make deploy
    ```
    and enjoy the full automation.<br />
    This command will also create the high level application with the programming language you prefer.<br />
    But for this, it is necessary that you set something manually.
    You might be wondering how you can set the target board and how you can autodeploy. Well, to do this, there are files with the .mk extension where you can set the variables needed to deploy.
    The detailed description of what the make commands do is below.

<br />

---

## The BondMachine Makefile user guide

After creating a project, you can use the **make** command to manage the project.<br />
In every project there is a **Makefile** which defines a series of tasks that can be performed. With this special file you are able to manage the project.
There are two parallel workflows that you can follow in order to generate the firmware but both of them have some steps in common. The common steps are:

```
make bondmachine

Create the Bondmachine and all its connecting processors.
You can view a diagram of the Bondmachine just created with the following instructions:
```{: class="notranslate"}

```
make show

Use graphviz to visualize the architecture generated. 
```

```
make hdl

Generate the source HDL code (i.e. working_dir/bondmachine.sv, working_dir/bondmachine.vhd)
```

The first workflow commands are:

```
make synthesis

Start the project synthesis
```

```
make implementation

Start the project implementation
```

```
make bitstream

Start the project bitstream generation
```

```
make program

program the board if connected
```

The second workflow commands are:

```
make design_synthesis

Start the project synthesis
```

```
make design_implementation

Start the project implementation
```

```
make design_bitstream

Start the project bitstream generation
```

```
make kernel_module

Create the kernel module which runs on custom buildroot linux distribution
```

```
make buildroot

Create the custom buildroot linux sdcard-image.
```

## Makefile variables

Inside a project there is a local.mk file which contains all the variables necessary to create a project. It is searched directly from the Makefile file. Eventually variables can be set in other **.mk** files and included in the local.mk file for convenience.

The following is the list of commonly used **.mk** files inside a project (but you can also create your own):

1. **local.mk**
2. *deploy.mk*
3. *bmapi.mk*
4. *buildroot.mk*
5. *crosscompile.mk*
6. *simbatch.mk*

```
deploy.mk

In this file are defined all the variables necessary to deploy the firmware generated on the board you have previously selected
```

| Variable              | type          | description               |
| --------              | --------      | --------                  |
| `DEPLOY_DIR`            | mandatory     | target directory          |
| `DEPLOY_TARGET`         | mandatory     | target board              |
| `DEPLOY_DIR`            | mandatory     | target user on the board  |
| `DEPLOY_GROUP`          | mandatory     | target group on the board |

```
local.mk
In this file are defined all the variables necessary to create a project
```

| Variable              | type          | description       |
| --------              | --------      | --------          |
| `WORKING_DIR`           | mandatory     | directory name where the project is build (default) working_dir   |
| `CURRENT_DIR`           | mandatory     | current directory where you exec the makefile commands (default) $(shell pwd)   |
| `SOURCE_NEURALBOND`     | optional      | json file that describes the neural network you want to deploy on FPGA   |
| `NEURALBOND_LIBRARY`    | optional      | library of assembly neurons necessary to build the neural network on FPGA   |
| `NEURALBOND_ARGS`       | optional      | set of arguments to customize the neural network   |
| `BMINFO`                | mandatory     | json file   |
| `BOARD`                 | mandatory     | the target board for which you want to synthesize the firmware   |
| `MAPFILE`               | mandatory     | json file   |
| `SHOWARGS`              | optional      | variables to display in different ways the bondmachine graph  |
| `SHOWRENDERER`          | mandatory     | ... |
| `VERILOG_OPTIONS`       | mandatory     | ... |

```
bmapi.mk
```
